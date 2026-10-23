type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

function cleanup(bucket: Bucket, windowMs: number) {
  const now = Date.now();
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  cleanup(bucket, windowMs);
  if (bucket.timestamps.length >= limit) return false;
  bucket.timestamps.push(Date.now());
  return true;
}

export function clearRateLimits() {
  buckets.clear();
}
