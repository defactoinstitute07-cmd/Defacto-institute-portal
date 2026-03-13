import React, { useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Mail, Search, Send, Smartphone, Users, X } from "lucide-react";
import ERPLayout from "../components/ERPLayout";
import AlertMessage from "../components/common/AlertMessage";
import {
  fetchNotificationHistory,
  fetchNotificationRecipients,
  sendAdminNotifications
} from "../api/notificationApi";
import { getAdminProfile } from "../api/adminApi";
import { getAllBatches } from "../api/batchApi";
import { Filter, Trash2, CheckSquare, RefreshCcw } from "lucide-react";

const STATUS_STYLES = {
  sent: "bg-green-50 text-green-700 border border-green-200",
  partial: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
  logged: "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-gray-50 text-gray-600 border border-gray-200"
};

const formatDeliveryType = (deliveryType) => {
  if (deliveryType === "both") return "Push + Email";
  if (deliveryType === "push") return "Mobile Push";
  if (deliveryType === "email") return "Email";
  return deliveryType;
};

const countValidDeviceTokens = (deviceTokens = []) =>
  Array.isArray(deviceTokens)
    ? deviceTokens.filter((token) => typeof token === "string" && token.trim().length > 10).length
    : 0;

const NotificationsPage = () => {
  const [alert, setAlert] = useState(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [scheduledFor, setScheduledFor] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [sendToAll, setSendToAll] = useState(false);
  const [sendToBatch, setSendToBatch] = useState(false);

  const [deliveryMethods, setDeliveryMethods] = useState({
    push: true,
    email: false
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [history, setHistory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [recipientType, setRecipientType] = useState("student");

  // Filter States
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterPendingFees, setFilterPendingFees] = useState(false);
  const [filterPushReady, setFilterPushReady] = useState(false);

  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);

  const selectedIds = useMemo(
    () => selectedRecipients.map((s) => s._id),
    [selectedRecipients]
  );

  const activeDeliveryMethods = useMemo(
    () =>
      Object.entries(deliveryMethods)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [deliveryMethods]
  );

  const dispatchRecipients = useMemo(() => {
    if (sendToBatch) return recipients;
    return selectedRecipients;
  }, [recipients, selectedRecipients, sendToBatch]);

  const selectedPushReadyCount = useMemo(() => {
    return dispatchRecipients.filter((recipient) => {
      const tokenCount = recipient.pushStatus?.deviceTokenCount ?? countValidDeviceTokens(recipient.deviceTokens);
      return tokenCount > 0;
    }).length;
  }, [dispatchRecipients]);

  const selectedOnlineCount = useMemo(() => {
    return dispatchRecipients.filter((recipient) => recipient.activity?.status === "online").length;
  }, [dispatchRecipients]);

  const loadRecipients = async (search = "", filters = {}) => {
    const searchVal = search || studentSearch;
    const statusVal = filters.status || filterStatus;
    const batchVal = filters.batchId || filterBatch;
    const pendingVal = filters.pendingFees !== undefined ? filters.pendingFees : filterPendingFees;
    const pushReadyVal = filters.pushReady !== undefined ? filters.pushReady : filterPushReady;

    // If no search, no batch, no pending filter, and status is "active" (default), don't load
    // Actually, let's be strict: only load if search is present OR batch is selected OR pending fees is checked
    if (!searchVal.trim() && !batchVal && !pendingVal && !pushReadyVal && (statusVal === "active" || statusVal === "all")) {
      setRecipients([]);
      setLoadingRecipients(false);
      return;
    }

    setLoadingRecipients(true);
    try {
      const { data } = await fetchNotificationRecipients({
        search: searchVal,
        limit: 100,
        status: statusVal,
        batchId: batchVal,
        hasPendingFees: pendingVal,
        hasPushToken: pushReadyVal,
        recipientType: filters.recipientType || recipientType
      });
      setRecipients(data.students || []);
    } catch (err) {
      setAlert({ type: "error", text: "Failed to load recipients." });
    } finally {
      setLoadingRecipients(false);
    }
  };

  const loadBatches = async () => {
    try {
      const { data } = await getAllBatches();
      setBatches(data.batches || []);
    } catch (err) {
      console.error("Failed to load batches");
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await fetchNotificationHistory({ limit: 25 });
      setHistory(data.notifications || []);
    } catch {
      setAlert({ type: "error", text: "Failed to load notification history." });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleManualRefresh = async () => {
    await Promise.all([loadRecipients(studentSearch), loadHistory()]);
  };

  useEffect(() => {
    loadHistory();
    loadBatches();
    getAdminProfile()
      .then(({ data }) =>
        setNotificationsEnabled(data.notificationsEnabled !== false)
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadRecipients(studentSearch), 300);
    return () => clearTimeout(timer);
  }, [studentSearch, filterStatus, filterBatch, filterPendingFees, filterPushReady, recipientType]);

  useEffect(() => {
    if (!filterBatch && sendToBatch) {
      setSendToBatch(false);
    }
  }, [filterBatch, sendToBatch]);

  const toggleRecipient = (student) => {
    setSelectedRecipients((prev) => {
      const exists = prev.some((s) => s._id === student._id);
      return exists
        ? prev.filter((s) => s._id !== student._id)
        : [...prev, student];
    });
  };

  const selectAllFiltered = () => {
    setSelectedRecipients(prev => {
      const newSelections = recipients.filter(r => !prev.some(s => s._id === r._id));
      return [...prev, ...newSelections];
    });
  };

  const clearSelection = () => {
    setSelectedRecipients([]);
  };

  const toggleMethod = (method) =>
    setDeliveryMethods((prev) => ({
      ...prev,
      [method]: !prev[method]
    }));

  const handleSend = async (e) => {
    e.preventDefault();

    if (!message.trim())
      return setAlert({ type: "error", text: "Write a message first." });

    if (activeDeliveryMethods.length === 0)
      return setAlert({ type: "error", text: "Select delivery method." });

    if (sendToBatch && !filterBatch) {
      return setAlert({ type: "error", text: "Select a batch to send to." });
    }

    setSending(true);

    try {
      await sendAdminNotifications({
        title: title || 'ERP Notification',
        message,
        type,
        sendToAll,
        studentIds: sendToBatch ? [] : (sendToAll ? [] : selectedIds),
        batchId: sendToBatch ? filterBatch : "",
        deliveryMethods: activeDeliveryMethods,
        scheduledFor: scheduledFor || null,
        recipientType
      });

      setAlert({
        type: "success",
        text: "Notification sent successfully."
      });

      setMessage("");
      setSelectedRecipients([]);
      loadHistory();
    } catch {
      setAlert({
        type: "error",
        text: "Failed to send notification."
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <ERPLayout title="Notifications">
      <div className="space-y-6">

        {alert && <AlertMessage type={alert.type} message={alert.text} />}

        <div className="grid lg:grid-cols-[1.5fr_0.9fr] gap-6">

          {/* Compose Notification */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg">
                  <Bell size={18} />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    Compose Notification
                  </h2>
                  <p className="text-sm text-gray-500">
                    Send push or email notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={loadingRecipients || loadingHistory}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  <RefreshCcw size={14} className={loadingRecipients || loadingHistory ? "animate-spin" : ""} />
                  Refresh
                </button>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => { setRecipientType("student"); setSelectedRecipients([]); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${recipientType === "student" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecipientType("teacher"); setSelectedRecipients([]); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${recipientType === "teacher" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Teachers
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-5">

              {/* Title and Type */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Exam Alert"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                    focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                    Notification Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                    focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="general">General Notification</option>
                    <option value="fee">Fee Reminder</option>
                    <option value="attendance">Attendance Alert</option>
                    <option value="homework">Homework Upload</option>
                    <option value="announcement">Announcement</option>
                    <option value="exam">Exam Schedule</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm
                  focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Schedule For */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  Schedule Notification (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                    focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                  {scheduledFor && (
                    <button
                      type="button"
                      onClick={() => setScheduledFor("")}
                      className="px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 italic px-1">
                  Leave empty to send immediately.
                </p>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50/50">
                  <Filter size={14} className="text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm font-medium text-gray-700"
                  >
                    <option value="active">Active {recipientType === 'student' ? 'Students' : 'Teachers'}</option>
                    <option value="inactive">Inactive {recipientType === 'student' ? 'Students' : 'Teachers'}</option>
                    <option value="all">All Status</option>
                  </select>
                </div>

                {recipientType === 'student' && (
                  <>
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50/50">
                      <Users size={14} className="text-gray-400" />
                      <select
                        value={filterBatch}
                        onChange={(e) => setFilterBatch(e.target.value)}
                        className="w-full bg-transparent outline-none text-sm font-medium text-gray-700"
                      >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-gray-50/50">
                      <label className="flex items-center gap-2 cursor-pointer w-full text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={filterPendingFees}
                          onChange={(e) => setFilterPendingFees(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        Pending Fees
                      </label>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-gray-50/50">
                  <label className="flex items-center gap-2 cursor-pointer w-full text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={filterPushReady}
                      onChange={(e) => setFilterPushReady(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    Push Ready Only
                  </label>
                </div>
              </div>

              {recipientType === 'student' && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={sendToBatch}
                    onChange={(e) => setSendToBatch(e.target.checked)}
                    disabled={!filterBatch}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  Send to entire selected batch
                </label>
              )}

              {/* Search */}
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2">
                <Search size={16} className="text-gray-500" />
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name, roll no..."
                  className="w-full outline-none text-sm"
                />
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  disabled={recipients.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-indigo-200 
                  bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"
                >
                  <CheckSquare size={14} />
                  Select All Filtered ({recipients.length})
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedRecipients.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-red-200 
                   bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                  Clear Selection ({selectedRecipients.length})
                </button>
              </div>

              {/* Student List */}
              <div className="border rounded-lg max-h-72 overflow-y-auto">

                {loadingRecipients ? (
                  <div className="p-6 text-center text-gray-500 flex justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    Loading recipients...
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                    {!studentSearch.trim() && !filterBatch && !filterPendingFees && !filterPushReady ? (
                      <>
                        <Search size={32} className="text-gray-300 mb-2" />
                        <p className="font-medium">Search or Apply Filter to Load Recipients</p>
                        <p className="text-xs text-gray-400">Type a name or select a batch to see matching {recipientType}s</p>
                      </>
                    ) : (
                      <p>No recipients found matching your criteria</p>
                    )}
                  </div>
                ) : (
                  recipients.map((student) => {
                    const checked = selectedIds.includes(student._id);
                    const activityStatus = student.activity?.status || "inactive";
                    const pushDeviceCount = student.pushStatus?.deviceTokenCount ?? countValidDeviceTokens(student.deviceTokens);

                    return (
                      <label
                        key={student._id}
                        className={`flex gap-3 p-4 border-b cursor-pointer
                        ${checked ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(student)}
                        />

                        <div>
                          <p className="font-semibold text-gray-900">
                            {student.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {student.rollNo} • {student.className} •{" "}
                            {student.email}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${activityStatus === "online"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : activityStatus === "offline"
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                              {activityStatus}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${pushDeviceCount > 0
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}>
                              {pushDeviceCount > 0 ? `push ready (${pushDeviceCount})` : "no device token"}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}

              </div>

              {/* Delivery Methods */}

              <div className="grid md:grid-cols-2 gap-4">

                <button
                  type="button"
                  onClick={() => toggleMethod("push")}
                  className={`p-4 rounded-lg border flex gap-3 text-left
                  ${deliveryMethods.push
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200"
                    }`}
                >
                  <Smartphone size={18} />
                  <div>
                    <p className="font-semibold">Mobile Push</p>
                    <p className="text-xs text-gray-500">
                      Send push notification
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleMethod("email")}
                  className={`p-4 rounded-lg border flex gap-3 text-left
                  ${deliveryMethods.email
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200"
                    }`}
                >
                  <Mail size={18} />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-xs text-gray-500">
                      Send email message
                    </p>
                  </div>
                </button>

              </div>

              {/* Send Button */}

              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
              >
                {sending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Send size={16} />
                )}

                {sending ? "Sending..." : "Send Notification"}
              </button>

            </form>
          </div>

          {/* Overview */}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">

            <h3 className="font-semibold text-gray-900 mb-4">
              Dispatch Overview
            </h3>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between p-3 border rounded-lg">
                <span className="text-gray-500">Selected Students</span>
                <span className="font-semibold">{sendToBatch ? "Batch" : selectedIds.length}</span>
              </div>

              <div className="flex justify-between p-3 border rounded-lg">
                <span className="text-gray-500">Delivery Methods</span>
                <span className="font-semibold">
                  {activeDeliveryMethods.join(", ")}
                </span>
              </div>

              <div className="flex justify-between p-3 border rounded-lg">
                <span className="text-gray-500">Push Ready</span>
                <span className="font-semibold">{selectedPushReadyCount}</span>
              </div>

              <div className="flex justify-between p-3 border rounded-lg">
                <span className="text-gray-500">Online Now</span>
                <span className="font-semibold">{selectedOnlineCount}</span>
              </div>

            </div>
          </div>
        </div>

        {/* Notification History */}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">

          <div className="flex items-center justify-between mb-5">

            <h2 className="text-lg font-semibold text-gray-900">
              Notification History
            </h2>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {history.length} records
              </span>
              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCcw size={14} className={loadingHistory ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-gray-50 border-b">

                <tr className="text-gray-600 text-left">

                  <th className="py-3 px-4 font-semibold">Title & Type</th>
                  <th className="px-4 font-semibold">Message</th>
                  <th className="px-4 font-semibold">Delivery</th>
                  <th className="px-4 font-semibold">Target</th>
                  <th className="px-4 font-semibold">Time</th>
                  <th className="px-4 font-semibold">Status</th>

                </tr>

              </thead>

              <tbody>

                {loadingHistory ? (

                  <tr>
                    <td colSpan="5" className="text-center py-10 text-gray-500">

                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        Loading notification history...
                      </div>

                    </td>
                  </tr>

                ) : history.length === 0 ? (

                  <tr>
                    <td colSpan="5" className="text-center py-10 text-gray-400">
                      No notifications found
                    </td>
                  </tr>

                ) : (

                  history.map((entry) => (

                    <tr
                      key={entry._id}
                      className="border-b hover:bg-gray-50 transition"
                    >

                      {/* Message */}

                      <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate">
                        {entry.message}
                      </td>

                      {/* Delivery */}

                      <td className="px-4">

                        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
                          {formatDeliveryType(entry.deliveryType)}
                        </span>

                      </td>

                      {/* Student */}

                      <td className="px-4">

                        <div className="flex flex-col">

                          <span className="font-semibold text-gray-900">
                            {entry.studentId?.name || "Deleted"}
                          </span>

                          <span className="text-xs text-gray-500">
                            {entry.studentId?.rollNo}
                          </span>

                        </div>

                      </td>

                      {/* Time */}

                      <td className="px-4 text-gray-600">
                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                      </td>

                      {/* Status */}

                      <td className="px-4">

                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold
                  ${STATUS_STYLES[entry.status] || STATUS_STYLES.pending}`}
                        >
                          {entry.status}
                        </span>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </ERPLayout>
  );
};

export default NotificationsPage;
