const crypto = require('crypto');
const { getCacheValue, setCacheValue, deleteCacheByPrefix } = require('../config/redis');

const CACHE_PREFIXES = {
    dashboard: 'route:dashboard:',
    students: 'route:students:',
    fees: 'route:fees:',
    exams: 'route:exams:',
    batches: 'route:batches:',
    attendance: 'route:attendance:'
};

const toCachePayload = (statusCode, body) => JSON.stringify({
    statusCode,
    body
});

const fromCachePayload = (raw) => {
    if (!raw) {
        return null;
    }

    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    return raw;
};

const buildCacheKey = (req, prefix, varyByUser) => {
    const scope = varyByUser ? (req.admin?.id || req.userId || 'anonymous') : 'shared';
    const digest = crypto
        .createHash('sha1')
        .update(`${req.method}:${req.originalUrl}:${scope}`)
        .digest('hex');

    return `${prefix}${digest}`;
};

const cacheJsonResponse = ({
    prefix,
    ttlSeconds = 30,
    varyByUser = false
}) => async (req, res, next) => {
    if (req.method !== 'GET') {
        return next();
    }

    const cacheKey = buildCacheKey(req, prefix, varyByUser);

    try {
        const cached = fromCachePayload(await getCacheValue(cacheKey));
        if (cached) {
            res.set('X-Response-Cache', 'HIT');
            return res.status(cached.statusCode || 200).json(cached.body);
        }
    } catch {}

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        const statusCode = res.statusCode || 200;
        if (statusCode >= 200 && statusCode < 300) {
            setCacheValue(cacheKey, toCachePayload(statusCode, body), ttlSeconds)
                .catch(() => {});
            res.set('X-Response-Cache', 'MISS');
        }

        return originalJson(body);
    };

    return next();
};

const invalidateRouteCaches = async (prefixes = []) => {
    const uniquePrefixes = Array.from(new Set(
        (prefixes || []).filter(Boolean)
    ));

    await Promise.all(uniquePrefixes.map((prefix) => deleteCacheByPrefix(prefix)));
};

module.exports = {
    CACHE_PREFIXES,
    cacheJsonResponse,
    invalidateRouteCaches
};
