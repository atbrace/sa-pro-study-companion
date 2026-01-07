---
title: Performance Optimization
lastUpdated: 2026-01-06
---

# Performance Optimization

Performance optimization in AWS is a continuous process of monitoring, analyzing, and improving the efficiency of cloud resources. As a Solutions Architect Professional, you must understand how to systematically identify performance bottlenecks and apply appropriate optimization strategies across compute, storage, database, network, and application layers. This topic covers the critical services, architectural patterns, and best practices essential for the SAP-C02 exam, with emphasis on data-driven decision making using AWS performance monitoring and optimization tools.

## CloudFront Caching and Optimization

Amazon CloudFront is AWS's global content delivery network (CDN) that caches content at 450+ edge locations worldwide, reducing latency and origin load. Proper CloudFront configuration can reduce origin requests by 80-95% and improve global application response times from seconds to milliseconds.

### Cache Behaviors

Cache behaviors are the fundamental building blocks of CloudFront distributions, defining how different types of requests are processed, cached, and forwarded to origins.

**Key Concepts:**
- Each behavior has a path pattern (e.g., `/images/*`, `/api/*`, `/v2/api/*`)
- Behaviors are evaluated in priority order from top to bottom (first match wins)
- Default behavior (`/*`) catches all unmatched requests and cannot be deleted
- Different origins can be specified per behavior (S3, ALB, custom HTTP/HTTPS, MediaPackage, MediaStore)
- Each behavior can have unique cache settings, WAF associations, Lambda@Edge functions, and origin request configurations

**Real-World Scenario:** An e-commerce platform serves static product images from S3, dynamic API responses from ALB, and personalized recommendations from Lambda@Edge. Configure three cache behaviors:
1. `/images/*` - Long TTL (1 year), high cache hit ratio, S3 origin
2. `/api/*` - Short TTL (5 minutes), include Authorization header, ALB origin
3. Default (`/*`) - Medium TTL, Lambda@Edge for personalization, S3 origin

**AWS Documentation:**
- [CloudFront Cache Behaviors](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesCacheBehavior)
- [Working with Distributions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-working-with.html)

### Cache Key Configuration

The cache key is the critical determinant of cache efficiency. Each unique combination of cache key elements creates a separate cached object. Minimizing cache key variations maximizes your cache hit ratio and reduces origin load.

**Cache Key Components:**
- **Query strings** - All, none, or specific whitelisted parameters (e.g., `product-id`, `page`)
- **Headers** - Standard headers (Host, Accept-Encoding), CloudFront-specific headers (CloudFront-Viewer-Country, CloudFront-Is-Mobile-Viewer), custom headers
- **Cookies** - All, none, or specific whitelisted cookies
- **Normalized values** - CloudFront can normalize query strings and headers to improve cache hit ratio

**Cache Policies vs. Origin Request Policies (Critical Distinction):**

Prior to 2020, CloudFront used legacy cache behaviors where anything sent to the origin was included in the cache key. This created massive cache fragmentation. Modern CloudFront separates these concerns:

- **Cache Policy** - Defines ONLY what's included in the cache key (what makes objects unique for caching)
- **Origin Request Policy** - Defines what's sent to origin (can include more headers/cookies than cache key)
- **Separation benefit** - Cache identical content while passing origin-specific metadata (e.g., cache same page for all users but pass user-agent to origin for analytics)

**Example Configuration:**
```json
{
  "CachePolicy": {
    "Name": "ProductCachePolicy",
    "MinTTL": 1,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "QueryStringsConfig": {
      "QueryStringBehavior": "whitelist",
      "QueryStrings": ["product-id", "category"]
    },
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": ["CloudFront-Viewer-Country"]
    },
    "CookiesConfig": {
      "CookieBehavior": "none"
    }
  },
  "OriginRequestPolicy": {
    "Name": "ProductOriginPolicy",
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": ["User-Agent", "Referer", "CloudFront-Viewer-Country"]
    },
    "CookiesConfig": {
      "CookieBehavior": "all"
    }
  }
}
```

**Real-World Scenario:** A news website wants to cache articles by country (for localized content) but also wants to pass user session cookies to the origin for analytics. Cache policy includes only `CloudFront-Viewer-Country` header. Origin request policy includes that header PLUS all cookies. Result: One cached version per country, but origin still receives full user context.

**AWS Documentation:**
- [Understanding the Cache Key](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-the-cache-key.html)
- [Cache Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)
- [Origin Request Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html)

### Cache Optimization Strategies

Achieving high cache hit ratios (>90%) requires careful TTL configuration, cache key minimization, and strategic use of CloudFront features.

**TTL Configuration:**
- **Minimum TTL** - Floor for cache duration (prevents too-short caching even if origin says so)
- **Maximum TTL** - Ceiling for cache duration (limits how long stale content stays cached)
- **Default TTL** - Used when origin doesn't specify caching directives (typically 24 hours)
- **Origin headers** - `Cache-Control: max-age=3600` or `Expires` header can override default TTL within min/max bounds
- **Dynamic content** - Set minimum TTL to 0 and rely on origin headers for fine-grained control

**TTL Strategy by Content Type:**
| Content Type | Recommended TTL | Rationale |
|-------------|-----------------|-----------|
| Static assets (images, CSS, JS) | 1 year (31,536,000 sec) | Immutable with versioned filenames |
| HTML pages | 5-60 minutes | Balance freshness with cacheability |
| API responses | 0-300 seconds | Highly dynamic, use Cache-Control headers |
| User-specific content | 0 seconds | Don't cache or use Lambda@Edge for personalization |

**Cache Hit Ratio Improvement Techniques:**

1. **Minimize cache key components** - Each additional header/cookie/query parameter exponentially increases cache variations
2. **Use managed cache policies** - AWS-managed policies (CachingOptimized, CachingDisabled) follow best practices
3. **Normalize query string parameters** - CloudFront can sort parameters to prevent `/page?a=1&b=2` and `/page?b=2&a=1` from creating separate cache entries
4. **Exclude session cookies** - Session IDs in cache key create one cached object per user (0% cache sharing)
5. **Separate distributions** - Use dedicated distributions for static vs. dynamic content with different cache policies
6. **Use CloudFront Functions** - Normalize request attributes at edge before cache lookup
7. **Monitor CloudFront metrics** - Track CacheHitRate, OriginLatency, and Requests in CloudWatch

**Real-World Scenario:** A SaaS application had a 40% cache hit ratio because it included all cookies in the cache key, including session IDs. Solution: Create two cache behaviors - one for static assets (no cookies in cache key, 1-year TTL) and one for API endpoints (no cache key cookies, but forward to origin via origin request policy). Result: Cache hit ratio increased to 92%, origin requests dropped by 60%.

**AWS Documentation:**
- [Optimizing Cache Hit Ratio](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html)
- [Increasing the Proportion of Requests Served from Edge Caches](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio-explained.html)
- [CloudFront Monitoring](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/monitoring-using-cloudwatch.html)

### Cache Invalidation

Cache invalidation is the process of removing objects from CloudFront edge locations before their TTL expires. Understanding the trade-offs between invalidation methods is critical for cost optimization and deployment strategies.

**Invalidation Methods Comparison:**

| Method | Cost | Speed | Use Case | Drawback |
|--------|------|-------|----------|----------|
| **CloudFront Invalidation** | First 1,000 paths/month free, then $0.005/path | 5-15 minutes | Emergency fixes, small deployments | Costs scale with path count |
| **Versioned Objects** | Free | Instant (no invalidation needed) | All static assets, CI/CD pipelines | Requires build process changes |
| **Short TTL** | Free | Automatic based on TTL | Frequently changing content | Higher origin load, lower cache hit ratio |

**Invalidation Request Patterns:**
```bash
# Invalidate specific files (counts as 1 path each)
/images/logo.png
/css/styles.css

# Invalidate directory and all files (counts as 1 path)
/images/*

# Invalidate all .jpg files in directory (counts as 1 path)
/images/*.jpg

# Invalidate everything (counts as 1 path, but impacts all edge locations)
/*

# Invalidate with query strings (counts as 1 path)
/api/products?category=electronics
```

**Critical Exam Concepts:**
- Wildcard invalidations (`/images/*`) count as ONE path, not one per file
- Invalidations affect ALL edge locations globally (can't target specific regions)
- Maximum 3,000 invalidations can be in progress concurrently per distribution
- Invalidation completion is eventual - different edge locations update at different times
- Invalidations don't delete objects, they mark them for revalidation with origin

**Versioned Object Strategy (Best Practice):**

Instead of invalidating `/css/styles.css`, use versioned filenames:
```
Before: /css/styles.css
After:  /css/styles.a3f2c1b.css  (hash of content)
        /css/styles.v2.1.0.css    (semantic version)
        /css/styles-20260106.css  (date stamp)
```

**Benefits:**
- Zero invalidation costs
- Instant cache updates (new filename = immediate cache miss, fetch from origin)
- Atomic deployments (old and new versions coexist during rollout)
- Easy rollbacks (just point back to old version)
- Works perfectly with CI/CD pipelines (webpack, CloudFormation, CDK auto-generate hashes)

**Real-World Scenario:** A media company deployed new video player JavaScript but invalidated `/*` across their distribution. Cost: $0.005 × 15,000 files = $75. Better approach: Use webpack to generate `player.abc123.js`, update HTML to reference new hash, deploy HTML with short TTL (5 min). Cost: $0, instant cache updates, no invalidation needed.

**AWS Documentation:**
- [Invalidating Files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
- [Invalidation Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [Versioning Static Assets](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ReplacingObjects.html)

## ElastiCache and DAX

In-memory caching reduces database load, improves response times from hundreds of milliseconds to microseconds, and enables applications to scale to millions of requests per second. ElastiCache provides managed Redis and Memcached, while DAX is purpose-built for DynamoDB.

### ElastiCache for Redis vs. Memcached

Choosing between Redis and Memcached depends on application requirements for data structures, persistence, and architectural complexity.

| Feature | Redis | Memcached |
|---------|-------|-----------|
| **Data Types** | Strings, lists, sets, sorted sets, hashes, bitmaps, hyperloglogs, geospatial indexes | Simple key-value strings only |
| **Persistence** | Yes (AOF append-only file, RDB snapshots) | No - data lost on restart |
| **Replication** | Multi-AZ with automatic failover (primary + replicas) | Multi-node with no replication between nodes |
| **Backup/Restore** | Yes - automated and manual snapshots | No |
| **Clustering** | Redis Cluster mode with sharding (up to 500 nodes) | Multi-threaded per node, horizontal scaling via client-side sharding |
| **Pub/Sub** | Yes - built-in publish/subscribe messaging | No |
| **Lua Scripting** | Yes - server-side scripting for atomic operations | No |
| **Transactions** | Yes - MULTI/EXEC for atomic command batches | No |
| **Geospatial** | Yes - GEOADD, GEORADIUS for location queries | No |
| **Multi-threading** | Single-threaded per shard | Multi-threaded - better CPU utilization |
| **Eviction Policies** | 8 policies including LRU, LFU, volatile-ttl | LRU only |
| **Use Case** | Complex data structures, persistence, HA, session stores, leaderboards, geospatial apps | Simple caching, extremely high throughput, minimal feature requirements |

**When to Choose Redis:**
- Need complex data types (leaderboards use sorted sets, session stores use hashes)
- Require persistence (cache survives restarts)
- Need pub/sub messaging (real-time notifications, chat)
- Want automated backups and point-in-time recovery
- Require multi-AZ automatic failover
- Need transactions or Lua scripts for atomic operations

**When to Choose Memcached:**
- Simple key-value caching with no persistence requirements
- Need multi-threaded performance (better CPU utilization on large nodes)
- Horizontal scaling via client-side sharding is acceptable
- Want simplest possible caching layer
- Budget-conscious (Memcached nodes slightly cheaper)

**Real-World Scenario:** An e-commerce platform caches user sessions, product catalog, and shopping carts. Redis is chosen because: 1) Sessions use Redis hashes for structured storage, 2) Shopping carts need persistence (users expect cart to survive server restarts), 3) Product popularity rankings use sorted sets, 4) Multi-AZ replication provides high availability during failures.

**AWS Documentation:**
- [Comparing Memcached and Redis](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SelectEngine.html)
- [ElastiCache for Redis](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/WhatIs.html)
- [ElastiCache for Memcached](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/WhatIs.html)

### Redis Cluster Mode

Redis cluster mode determines how data is distributed and how the cache scales. This is a critical architectural decision that cannot be changed after cluster creation.

**Cluster Mode Disabled (Single Shard):**
- **Architecture:** Single primary node with 0-5 read replicas
- **Data distribution:** All data on single shard (no partitioning)
- **Scaling:** Vertical only - scale up node size
- **Endpoint:** Single primary endpoint and reader endpoint
- **Failover:** Automatic promotion of replica to primary on failure
- **Maximum memory:** Limited to single node memory (up to 317 GB on r7g.16xlarge)
- **Use cases:** Small datasets (<100 GB), simple applications, development/testing
- **Complexity:** Simpler configuration, easier to manage

**Cluster Mode Enabled (Multi-Shard):**
- **Architecture:** Data partitioned across 1-500 shards (node groups)
- **Data distribution:** Each shard has primary + 0-5 replicas (horizontal sharding via hash slots)
- **Scaling:** Horizontal - add/remove shards for capacity, vertical - change node size for performance
- **Endpoints:** Configuration endpoint (cluster-aware clients) or individual node endpoints
- **Failover:** Automatic per-shard failover (replica promotes to primary)
- **Maximum memory:** 500 shards × 317 GB = 158.5 TB theoretical maximum
- **Hash slots:** 16,384 total hash slots distributed across shards
- **Use cases:** Large datasets (>100 GB), high throughput requirements, write-heavy workloads
- **Complexity:** Requires cluster-aware client libraries, more complex to manage

**Scaling Comparison:**

| Operation | Cluster Disabled | Cluster Enabled |
|-----------|------------------|-----------------|
| **Add read capacity** | Add read replicas (max 5) | Add replicas per shard (max 5 per shard) |
| **Add write capacity** | Scale up node size only | Add shards (distributes writes) |
| **Online scaling** | Add replicas online, change node type requires snapshot | Add/remove shards online, change node type online |
| **Data migration** | Automatic for replicas | Automatic shard rebalancing |

**Critical Cluster Mode Decision Factors:**

Choose **Cluster Mode DISABLED** when:
- Dataset fits in single node memory (<100 GB)
- Read-heavy workload (replicas handle reads)
- Application not cluster-aware (simpler client code)
- Minimal operational complexity desired

Choose **Cluster Mode ENABLED** when:
- Dataset exceeds 100 GB
- Write throughput exceeds single node capacity
- Need horizontal scaling flexibility
- Want to distribute write load across nodes
- High availability critical (multi-shard redundancy)

**Real-World Scenario:** A gaming leaderboard initially used cluster mode disabled (20 GB dataset, 5 read replicas). As game popularity grew to 500 GB of player data with high write volume, they migrated to cluster mode enabled with 10 shards. Result: 10x write capacity, horizontal scaling capability, but required application update to use cluster-aware Redis client.

**AWS Documentation:**
- [Redis Cluster Mode](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Replication.Redis-RedisCluster.html)
- [Replication: Redis (Cluster Mode Disabled) vs. Redis (Cluster Mode Enabled)](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Replication.Redis-RedisCluster.html)
- [Scaling ElastiCache for Redis Clusters](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Scaling.html)

### ElastiCache Caching Strategies

Selecting the right caching strategy balances data freshness, cache consistency, and system performance. Most production systems use a combination of strategies based on data access patterns.

**1. Lazy Loading (Cache-Aside Pattern):**

Application code explicitly manages cache - reads check cache first, writes go directly to database.

```python
def get_user(user_id):
    cache_key = f"user:{user_id}"

    # Step 1: Check cache first
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)  # Cache hit - fast path

    # Step 2: Cache miss - query database
    user = db.query(f"SELECT * FROM users WHERE id = {user_id}")

    # Step 3: Populate cache for future requests
    redis.set(cache_key, json.dumps(user), ex=3600)  # 1-hour TTL
    return user
```

**Advantages:**
- Only requested data is cached (no wasted memory)
- Cache failures don't break application (degrades gracefully to database)
- Simple to implement and reason about

**Disadvantages:**
- Cache miss penalty (3 round trips: cache check, database query, cache write)
- Stale data possible until TTL expires
- Cache warm-up required after restart (empty cache, high database load)

**2. Write-Through Caching:**

Application writes to cache synchronously with database writes, ensuring cache is always up-to-date.

```python
def update_user(user_id, data):
    cache_key = f"user:{user_id}"

    # Step 1: Update database first (source of truth)
    db.update(f"UPDATE users SET name='{data['name']}' WHERE id={user_id}")

    # Step 2: Update cache immediately (synchronously)
    redis.set(cache_key, json.dumps(data), ex=3600)

    return data
```

**Advantages:**
- Cache data always current (no stale reads)
- Read latency consistently low (cache always populated)
- Simplifies consistency model

**Disadvantages:**
- Write latency increased (extra cache write operation)
- Wasted cache writes for data never read
- Cache failure impacts write operations

**3. Write-Behind (Write-Back) Caching:**

Writes go to cache first, asynchronously persisted to database later (batch writes).

```python
def update_user_async(user_id, data):
    cache_key = f"user:{user_id}"

    # Step 1: Write to cache immediately
    redis.set(cache_key, json.dumps(data), ex=3600)

    # Step 2: Queue database write for async processing
    write_queue.publish({
        'operation': 'update_user',
        'user_id': user_id,
        'data': data
    })
```

**Advantages:**
- Lowest write latency (cache writes are fast)
- Batch writes reduce database load
- High write throughput

**Disadvantages:**
- Data loss risk if cache fails before database sync
- Complex to implement correctly
- Inconsistency window between cache and database

**4. Adding TTL (Time-to-Live):**

TTL is essential to prevent stale data accumulation and memory exhaustion.

```python
# Different TTLs for different data types
redis.set("user:123", user_data, ex=3600)           # 1 hour - frequently changing
redis.set("product:456", product_data, ex=86400)    # 24 hours - relatively stable
redis.set("config:app", config_data, ex=300)        # 5 minutes - critical freshness
```

**TTL Strategy Guidelines:**

| Data Type | Recommended TTL | Rationale |
|-----------|-----------------|-----------|
| User sessions | 30-60 minutes | Balance between UX and memory |
| User profiles | 1-24 hours | Infrequently changed |
| Product catalog | 4-24 hours | Updated periodically |
| API rate limits | 1-5 minutes | Short window for quota enforcement |
| Database query results | 5-60 minutes | Balance staleness vs. hit ratio |
| Static configuration | 5-15 minutes | Rarely changes but needs eventual consistency |

**Critical TTL Considerations:**
- **Always set TTL** - Without TTL, cache grows unbounded and fills memory
- **Eviction policies** - Configure `maxmemory-policy` (allkeys-lru, volatile-lru, etc.) as backup when memory full
- **TTL vs. manual invalidation** - TTL handles common case, manual invalidation for immediate updates
- **Randomize TTLs** - Add jitter to prevent thundering herd (`ex=3600 + random(0, 300)`)

**Combined Strategy (Recommended for Production):**

```python
def get_user_optimized(user_id):
    cache_key = f"user:{user_id}"

    # Lazy loading for reads
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)

    user = db.query(user_id)
    redis.set(cache_key, json.dumps(user), ex=3600)
    return user

def update_user_optimized(user_id, data):
    cache_key = f"user:{user_id}"

    # Write-through for writes
    db.update(user_id, data)
    redis.set(cache_key, json.dumps(data), ex=3600)

    # Optional: Invalidate related caches
    redis.delete(f"user_list:active")

    return data
```

**Real-World Scenario:** A social media platform uses lazy loading for user profiles (95% read ratio), write-through for user settings (critical consistency), and write-behind for analytics events (high volume, eventual consistency acceptable). TTLs: profiles 1 hour, settings 5 minutes, analytics 30 seconds.

**AWS Documentation:**
- [Caching Strategies](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/Strategies.html)
- [Best Practices for Amazon ElastiCache](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/BestPractices.html)
- [Redis Eviction Policies](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/redis-memory-management.html)

### DynamoDB Accelerator (DAX)

DAX is a fully managed, in-memory cache specifically designed for DynamoDB, providing microsecond response times for read-heavy workloads. DAX is a write-through cache that sits transparently between applications and DynamoDB.

**Key Features:**
- **Microsecond latency** - Cached reads in microseconds vs. single-digit milliseconds for DynamoDB
- **Write-through caching** - All writes go through DAX to DynamoDB, cache automatically updated
- **API-compatible** - Drop-in replacement for DynamoDB SDK (change endpoint, no code changes)
- **Dual caching layers:**
  - **Item cache** - Caches GetItem and BatchGetItem responses (default TTL: 5 minutes)
  - **Query cache** - Caches Query and Scan results (default TTL: 5 minutes)
- **Up to 10x performance improvement** for read-heavy workloads
- **Fully managed** - AWS handles patching, scaling, recovery

**DAX Cluster Architecture:**
```
Application (DynamoDB SDK with DAX endpoint)
    ↓
DAX Cluster (3-10 nodes in VPC)
  - Primary node (write path)
  - Read replica nodes (read path)
  - Item cache (GetItem, BatchGetItem)
  - Query cache (Query, Scan)
    ↓
DynamoDB Table (source of truth)
```

**DAX vs. ElastiCache for DynamoDB:**

| Feature | DAX | ElastiCache (Redis/Memcached) |
|---------|-----|-------------------------------|
| **Integration** | DynamoDB SDK compatible (change endpoint only) | Requires application cache logic |
| **Cache invalidation** | Automatic (write-through) | Manual invalidation required |
| **Consistency** | Eventually consistent (same as DynamoDB) | Application-managed consistency |
| **Data structures** | DynamoDB items and query results only | Flexible (any data structure) |
| **Write path** | All writes go through DAX to DynamoDB | Application writes to DynamoDB, invalidates cache |
| **Query caching** | Built-in Query/Scan result caching | Must cache query results manually |
| **Complexity** | Minimal (managed cache logic) | Higher (application implements caching patterns) |
| **Use case** | DynamoDB-specific optimization | General-purpose caching, multiple data sources |
| **VPC requirement** | Must be in VPC | Can be in VPC or outside |
| **Cost** | Node hours + data transfer | Node hours + data transfer |

**When to Use DAX:**
- **Read-heavy workloads** - 90%+ reads vs. writes (write-heavy gains no benefit)
- **Eventually consistent reads acceptable** - DAX doesn't support strongly consistent reads
- **Hot key access patterns** - Repeated reads of popular items (product catalog, user profiles)
- **Microsecond latency required** - Sub-millisecond response time critical
- **Simple integration preferred** - Want DynamoDB caching without custom code

**When to Use ElastiCache Instead:**
- Need strongly consistent reads (DAX doesn't support)
- Require complex cache eviction logic beyond TTL
- Want to cache data from multiple sources (DynamoDB + RDS + APIs)
- Need custom data transformations before caching
- Require advanced Redis features (sorted sets, pub/sub, transactions)

**DAX Configuration Best Practices:**

1. **Cluster sizing:** Minimum 3 nodes for production (1 primary, 2 replicas for HA)
2. **Node type selection:** Start with t3.small, scale based on cache hit ratio and throughput
3. **TTL configuration:**
   - Item cache TTL: 5 minutes default (adjust based on data freshness requirements)
   - Query cache TTL: 5 minutes default (shorter for highly dynamic data)
4. **Parameter group settings:**
   - `query-ttl-millis`: Query cache TTL (default 300,000 ms = 5 min)
   - `record-ttl-millis`: Item cache TTL (default 300,000 ms = 5 min)
5. **Security:** DAX clusters run in VPC, use security groups to control access
6. **Encryption:** Supports encryption at rest and in transit

**Real-World Scenario:** An e-commerce platform has a product catalog with 1 million items in DynamoDB. 90% of traffic queries the top 1,000 popular products. Without DAX: 50,000 GetItem requests/sec hitting DynamoDB, cost $X/month. With DAX (3-node cluster): 95% cache hit ratio, 47,500 requests/sec served from cache at microsecond latency, 2,500 requests/sec to DynamoDB. Result: 10x faster response time, 40% cost reduction (DAX cluster cost < DynamoDB read capacity savings).

**Critical Exam Concepts:**
- DAX does NOT support strongly consistent reads (only eventually consistent)
- DAX is write-through (writes go to DynamoDB immediately, cache updated automatically)
- DAX requires VPC (cannot be used outside VPC)
- DAX is DynamoDB-specific (cannot cache other data sources)
- Changing DAX endpoint in SDK is the ONLY code change required

**AWS Documentation:**
- [DynamoDB Accelerator (DAX)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html)
- [DAX Cluster Components](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.cluster.html)
- [DAX Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.best-practices.html)
- [In-Memory Acceleration with DAX](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.html)

## Database Performance Optimization

Database performance directly impacts application responsiveness and user experience. RDS and DynamoDB provide multiple optimization levers including read replicas, connection pooling, query optimization, and intelligent schema design.

### RDS Performance Optimization

**Read Replicas for Horizontal Read Scaling:**

Read replicas enable read workload distribution across multiple database instances.

- **Replication:** Asynchronous replication from primary (source) instance
- **Replica limits:**
  - Aurora: Up to 15 read replicas per cluster
  - MySQL, PostgreSQL, MariaDB: Up to 5 read replicas
  - SQL Server, Oracle: Up to 5 read replicas (specific versions)
- **Cross-region replicas:** Supported for disaster recovery and global read scaling
- **Promotion:** Replicas can be promoted to standalone instance (becomes independent database)
- **Read-only workloads:** Replicas serve SELECT queries only (no writes)
- **Replication lag:** Monitor `ReplicaLag` metric (typically seconds, can increase under heavy write load)

**Use Cases:**
1. **Read scaling** - Distribute read traffic across replicas (e.g., reporting queries to replica, app reads to primary)
2. **Analytics workloads** - Run heavy analytics on replica without impacting production
3. **Disaster recovery** - Cross-region replica for regional failover
4. **Data locality** - Regional replicas reduce latency for global users

**Real-World Scenario:** A SaaS application experiences 90% reads, 10% writes. Single RDS instance hits CPU limits during business hours. Solution: Create 3 read replicas, configure application to route SELECT queries to replicas (using reader endpoint for Aurora, or round-robin for standard RDS). Result: Primary instance CPU drops from 85% to 40%, query latency reduced by 60%.

**RDS Proxy for Connection Management:**

RDS Proxy is a fully managed database proxy that pools and shares connections, improving application scalability and resilience.

**Key Features:**
- **Connection pooling** - Maintains warm connection pool, reduces connection establishment overhead (100ms+ saved per request)
- **Application scalability** - Serverless applications (Lambda) can scale to thousands of concurrent executions without exhausting database connections
- **Automatic failover** - Detects database failures and routes to healthy instance in <30 seconds (vs. 60-120 seconds for DNS-based failover)
- **IAM authentication** - Centralized credential management, enforces IAM policies
- **Reduced database memory** - Fewer active connections = lower memory consumption on database instance
- **Supported engines:** MySQL, PostgreSQL, Aurora MySQL, Aurora PostgreSQL

**Connection Overhead Without Proxy:**
```
Lambda invocation → New DB connection (100-200ms overhead) → Query (10ms) → Close connection
Result: 110-210ms per request, connection storms during traffic spikes
```

**With RDS Proxy:**
```
Lambda invocation → Proxy reuses pooled connection (0ms overhead) → Query (10ms)
Result: 10ms per request, smooth scaling during traffic spikes
```

**When to Use RDS Proxy:**
- **Serverless architectures** - Lambda, ECS Fargate with unpredictable scaling
- **Connection storm prevention** - Applications that create/destroy connections frequently
- **High availability requirement** - Need faster failover than DNS TTL allows
- **IAM-based authentication** - Want to manage database credentials via IAM
- **Connection limit constraints** - Database connection limit becoming bottleneck

**Real-World Scenario:** A serverless API built with Lambda connects to RDS PostgreSQL. During traffic spikes, Lambda scales to 500 concurrent executions. PostgreSQL max_connections = 200. Without proxy: Connection errors ("too many connections"). With RDS Proxy: Proxy maintains 50 pooled connections to database, multiplexes 500 Lambda requests through them. Result: Zero connection errors, 90% reduction in connection overhead.

**RDS Performance Insights:**

Performance Insights is an advanced database monitoring tool that identifies performance bottlenecks through visual analysis of database load.

**Key Capabilities:**
- **Visual dashboard** - Time-series graph of database load (average active sessions) vs. maximum capacity
- **Top SQL** - Identifies queries consuming most database load (CPU, I/O, locks, waits)
- **Wait event analysis** - Shows what database is waiting on (CPU, disk I/O, lock contention, network)
- **Dimension filtering** - Filter by SQL hash, username, hostname, database name
- **Historical retention:**
  - Free tier: 7 days of performance data
  - Paid: Up to 2 years (additional cost per vCPU per month)

**Performance Insights Metrics:**
- **Database Load (DB Load)** - Average active sessions (AAS) over time period
- **Maximum vCPU** - Database instance CPU capacity (baseline for comparison)
- **Top SQL by Load** - Queries ranked by total database time consumed
- **Wait events:**
  - `CPU` - Query execution time
  - `IO:XactSync` - Transaction commit waiting for disk sync
  - `Lock:transactionid` - Row-level lock contention
  - `IO:DataFileRead` - Waiting for data file reads from disk

**Using Performance Insights to Optimize:**

1. **Identify problematic queries** - Look for SQL with high DB load contribution
2. **Analyze wait events** - Determine if issue is CPU, I/O, locks, or other waits
3. **Optimize based on findings:**
   - High CPU wait: Optimize query (add indexes, rewrite inefficient SQL)
   - High I/O wait: Add indexes, increase storage IOPS, enable read replicas
   - High lock wait: Review transaction isolation levels, optimize lock holding duration
4. **Monitor impact** - Track DB load reduction after optimizations

**Real-World Scenario:** Performance Insights shows DB load at 8 AAS (average active sessions) on a db.r5.xlarge (4 vCPUs). Top SQL is a complex JOIN query consuming 60% of load with `IO:DataFileRead` waits. Analysis reveals missing index on JOIN column. After creating index: Query load drops to 5% of total, DB load decreases to 3 AAS, I/O wait eliminated.

**Query Optimization Techniques:**

**1. Enable slow query logs:**
```sql
-- MySQL/MariaDB
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- Log queries taking >2 seconds

-- PostgreSQL
ALTER DATABASE mydb SET log_min_duration_statement = 2000;  -- milliseconds
```

**2. Analyze execution plans:**
```sql
-- MySQL
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
```

**3. Add appropriate indexes:**
```sql
-- Index frequently queried columns
CREATE INDEX idx_customer_id ON orders(customer_id);

-- Composite index for multi-column queries
CREATE INDEX idx_customer_status ON orders(customer_id, status);

-- Covering index (includes all SELECT columns)
CREATE INDEX idx_covering ON orders(customer_id, status, order_date, total);
```

**4. Parameter groups for engine tuning:**
- MySQL: `innodb_buffer_pool_size` (default 75% of RAM), `max_connections`
- PostgreSQL: `shared_buffers` (25% of RAM), `work_mem`, `effective_cache_size`
- Aurora: Automatically tuned, minimal manual intervention needed

**5. Consider Aurora for superior performance:**
- 5x faster than standard MySQL, 3x faster than standard PostgreSQL
- Storage auto-scales (10 GB to 128 TB)
- Up to 15 read replicas with <10ms replica lag
- Parallel query for analytics workloads
- Continuous backup to S3 with point-in-time recovery

**AWS Documentation:**
- [Amazon RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Using Amazon RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [RDS Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html)
- [Best Practices for Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Aurora Performance and Scaling](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Managing.Performance.html)

### DynamoDB Performance Optimization

DynamoDB performance optimization centers on intelligent partition key design, appropriate index usage, and capacity mode selection. Poor partition key design is the most common cause of throttling and performance issues.

**Partition Key Design Principles:**

The partition key determines how data is distributed across DynamoDB's underlying storage partitions. Good partition key design is critical for avoiding hot partitions (uneven load distribution).

**Design Principles:**
1. **High cardinality** - Many unique values (millions preferred)
2. **Uniform access patterns** - Queries distributed evenly across partition keys
3. **Avoid time-based partition keys** - Prevent hot partitions during peak periods
4. **Avoid low-cardinality attributes** - Status fields, types, categories create hot partitions
5. **Consider access patterns** - Design for your query patterns (who queries what, how often)

**Example - Poor Partition Key Designs:**

| Bad Design | Problem | Impact |
|------------|---------|--------|
| `status` (3 values: pending, active, inactive) | Low cardinality, uneven access (90% queries hit "active") | Hot partition, throttling on "active" partition, wasted capacity on others |
| `date` (YYYY-MM-DD format) | Time-based, all writes go to current date | All writes hit single partition, unused capacity on historical partitions |
| `region` (5 regions: us-east, us-west, eu, asia, latam) | Low cardinality, uneven distribution (80% traffic in us-east) | Hot partition in us-east, throttling during peak hours |
| `item_type` (10 types: book, electronics, clothing...) | Low cardinality, uneven popularity (electronics 50% of queries) | Throttling on popular types, wasted capacity on others |

**Example - Good Partition Key Designs:**

| Good Design | Benefit | Reasoning |
|-------------|---------|-----------|
| `user_id` (millions of unique users) | High cardinality, even distribution | Each user ID is unique, queries spread across millions of partitions |
| `device_id` (IoT sensor IDs, millions of devices) | High cardinality, independent access | Each device writes to own partition, perfect distribution |
| `email` (unique per user) | High cardinality, natural access pattern | Users query by email, even distribution |
| `composite: {user_id}#{timestamp}` | Prevents hot keys, enables range queries | Distributes writes across user IDs, allows time-based queries within user |

**Composite Partition Keys (Sharding Technique):**

When natural high-cardinality keys aren't available, create composite keys to artificially distribute load.

```javascript
// Bad: Low cardinality partition key
{
  "partition_key": "2024-01-05",  // All today's writes hit single partition
  "sort_key": "event_id"
}

// Good: Composite partition key with sharding
{
  "partition_key": "2024-01-05#shard_7",  // Distribute across 10 shards (0-9)
  "sort_key": "event_id"
}

// Application logic to query:
// Query all 10 shards in parallel, merge results
```

**Real-World Scenario:** An IoT application writes sensor data using `date` as partition key. All 1 million devices write to single partition for current date, causing throttling. Solution: Change partition key to `device_id`, sort key to `timestamp`. Result: Writes distributed across 1 million partitions, zero throttling, 90% reduction in consumed capacity.

**Global Secondary Indexes (GSI) vs. Local Secondary Indexes (LSI):**

Indexes enable querying on non-key attributes. Choosing between GSI and LSI impacts query flexibility, consistency, and cost.

| Feature | Global Secondary Index (GSI) | Local Secondary Index (LSI) |
|---------|------------------------------|----------------------------|
| **Partition Key** | Different from base table (alternative partition key) | Same as base table |
| **Sort Key** | Different from base table (alternative sort key) | Different from base table (alternative sort key) |
| **Consistency** | Eventually consistent only | Supports strongly consistent reads |
| **Provisioning** | Separate RCU/WCU (independent capacity) | Shares RCU/WCU with base table |
| **Creation** | Can be added/removed anytime | Must be created at table creation (immutable) |
| **Limit** | Up to 20 GSIs per table | Up to 5 LSIs per table |
| **Projected Attributes** | Choose which attributes to project (keys-only, include, all) | Choose which attributes to project |
| **Use Case** | Query on different attributes than table key | Alternative sort patterns within same partition |
| **Storage Cost** | Separate storage for index data | Part of base table storage |

**When to Use GSI:**
- Need to query by attribute not in base table key (e.g., query users by email when table key is user_id)
- Need different partition key distribution (e.g., partition by product_id for product queries)
- Want to add index after table creation
- Need independent scaling (separate capacity from base table)

**When to Use LSI:**
- Need alternative sort order within same partition (e.g., partition by user_id, sort by either timestamp or status)
- Require strongly consistent reads from index
- Want to save on provisioned capacity (shares with table)
- Design is finalized before table creation (cannot add LSI later)

**Example - GSI Use Case:**
```
Base Table:
  Partition Key: user_id
  Sort Key: order_id

GSI "email-index":
  Partition Key: email
  Sort Key: user_id

Query: Find user by email
→ Use GSI to query by email (base table can't query by email)
```

**Example - LSI Use Case:**
```
Base Table:
  Partition Key: user_id
  Sort Key: timestamp

LSI "status-index":
  Partition Key: user_id (same as table)
  Sort Key: status

Query: Get all orders for user sorted by status instead of timestamp
→ Use LSI to query same user's orders in different sort order
```

**Capacity Modes:**

| Feature | On-Demand Mode | Provisioned Mode |
|---------|----------------|------------------|
| **Billing** | Pay per request ($1.25/million writes, $0.25/million reads) | Pay for provisioned capacity (RCU/WCU hourly rate) |
| **Scaling** | Automatic (instant scale to any level) | Manual or auto-scaling (gradual scale up/down) |
| **Use Case** | Unpredictable traffic, new workloads, spiky patterns | Predictable steady traffic, cost optimization |
| **Cost at Scale** | Higher per request cost | Lower cost for sustained high traffic (30-60% cheaper) |
| **Throttling** | Adaptive capacity (rarely throttles) | Throttles if exceed provisioned capacity |
| **Burst Capacity** | Unlimited | Burst capacity up to 300 seconds of unused capacity |
| **Switch Frequency** | Can switch to/from provisioned once per 24 hours | Can switch to/from on-demand once per 24 hours |

**Cost Comparison Example:**
- Workload: 10 million reads/month, 2 million writes/month
- On-Demand: (10M × $0.25/M) + (2M × $1.25/M) = $2.50 + $2.50 = $5.00/month
- Provisioned (auto-scaled average): 5 RCU + 1 WCU = $2.85/month (**43% cheaper**)

**When to Use On-Demand:**
- New application with unknown traffic patterns
- Serverless applications with intermittent traffic
- Spiky workloads (Black Friday sales, viral events)
- Development/test environments with variable usage
- Workloads where cost predictability is less important than operational simplicity

**When to Use Provisioned:**
- Predictable, steady traffic patterns
- Cost-sensitive workloads (high sustained throughput)
- Mature applications with historical usage data
- Applications where auto-scaling can accommodate traffic patterns

**DynamoDB Streams for Change Data Capture:**

Streams capture item-level modifications in near real-time, enabling event-driven architectures.

**Key Features:**
- **Capture changes:** INSERT, MODIFY, DELETE operations
- **Near real-time:** Changes available in stream within seconds
- **Retention:** 24-hour stream retention
- **Processing:** Lambda, Kinesis Data Streams, Kinesis Client Library (KCL)
- **Stream view types:**
  - `KEYS_ONLY` - Only the partition and sort keys
  - `NEW_IMAGE` - Entire item after modification
  - `OLD_IMAGE` - Entire item before modification
  - `NEW_AND_OLD_IMAGES` - Both before and after images

**Use Cases:**
1. **Cross-region replication** - Stream changes to DynamoDB Global Tables (automatic)
2. **Materialized views** - Update aggregated data in another table (Lambda processes stream)
3. **Analytics** - Stream to Kinesis Data Firehose → S3 for data lake
4. **Notifications** - Send email/SNS when items change
5. **Search indexing** - Update Elasticsearch/OpenSearch when DynamoDB changes
6. **Audit trail** - Log all changes for compliance

**Real-World Scenario:** An e-commerce platform needs real-time inventory search. Product data stored in DynamoDB, but search requires Elasticsearch. Solution: Enable DynamoDB Streams, Lambda function processes stream and updates Elasticsearch index. Result: Search index automatically synchronized with database changes within 1-2 seconds.

**AWS Documentation:**
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Partition Key Design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [Local Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html)
- [Read/Write Capacity Modes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html)
- [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)

## Compute Optimizer Recommendations

AWS Compute Optimizer uses machine learning to analyze historical utilization metrics and recommend optimal AWS resources, reducing costs by up to 25% while maintaining performance.

**How Compute Optimizer Works:**

1. **Data collection:** Gathers CloudWatch metrics for supported resources (minimum 14 days, ideally 30 days)
2. **ML analysis:** Applies machine learning models trained on millions of AWS workloads to identify patterns
3. **Recommendations:** Generates rightsizing recommendations with projected performance impact and cost savings
4. **Continuous updates:** Refreshes recommendations as workload patterns change

**Supported Resources:**

| Resource Type | Metrics Analyzed | Recommendation Output |
|---------------|------------------|----------------------|
| **EC2 instances** | CPU, memory, network, storage | Instance type, pricing model (On-Demand/Reserved/Savings Plan) |
| **Auto Scaling groups** | Group-level aggregated metrics | Instance type, max/min/desired capacity |
| **EBS volumes** | IOPS, throughput, volume type | Volume type (gp2/gp3/io1/io2), provisioned IOPS/throughput |
| **Lambda functions** | Duration, memory, invocations | Memory configuration (128 MB to 10 GB) |
| **ECS on Fargate** | CPU, memory utilization | CPU/memory units |

**Recommendation Classifications:**

| Classification | Description | Recommended Action | Risk Level |
|----------------|-------------|-------------------|------------|
| **Under-provisioned** | Resource is constrained (high CPU/memory, throttling) | Upsize to larger instance/higher capacity | Performance degradation if no action |
| **Over-provisioned** | Resource significantly underutilized | Downsize to smaller instance/lower capacity | Low risk, cost savings opportunity |
| **Optimized** | Current configuration is appropriate | No action needed | N/A |

**Metrics Analyzed by Resource Type:**

**EC2 Instances:**
- **CPU utilization** - Average, maximum, p99 over lookback period
- **Memory utilization** - Requires CloudWatch agent (not collected by default)
- **Network throughput** - In/out bandwidth utilization
- **EBS throughput** - Read/write IOPS, throughput to attached volumes
- **Instance metadata** - Pricing model, Availability Zone, platform (Linux/Windows)

**Lambda Functions:**
- **Duration** - Execution time per invocation
- **Memory utilization** - Actual memory used vs. provisioned
- **Invocation frequency** - Patterns over time
- **Errors/throttles** - Failure rates affecting sizing decisions

**EBS Volumes:**
- **IOPS utilization** - Read/write operations per second vs. provisioned
- **Throughput utilization** - MBps vs. volume limits
- **Volume type** - Current type (gp2, gp3, io1, io2, st1, sc1)

**Critical Requirement: CloudWatch Agent for Memory Metrics**

Compute Optimizer CANNOT analyze memory utilization without CloudWatch agent installation. This is a common exam scenario.

**Installing CloudWatch Agent for Enhanced Recommendations:**

```bash
# Step 1: Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Step 2: Create configuration with memory metrics
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Step 3: Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json \
  -s

# Step 4: Verify metrics in CloudWatch (CWAgent namespace)
```

**Recommendation Implementation Workflow:**

1. **Enable Compute Optimizer:**
   - Console: Navigate to Compute Optimizer → Get Started
   - Requirements: Account must be standalone or management account in AWS Organizations
   - No additional cost for recommendations (CloudWatch charges still apply)

2. **Wait for data collection:**
   - Minimum: 14 days of metrics
   - Ideal: 30 days for better accuracy
   - Longer lookback = more accurate recommendations (accounts for weekly/monthly patterns)

3. **Review recommendations:**
   - Console: Dashboard shows aggregated savings opportunities
   - Filters: Instance family, finding classification, region
   - Export: Download as CSV or via API for automation

4. **Analyze projected impact:**
   - **Projected monthly savings** - Estimated cost reduction
   - **Performance risk** - Low/Medium/High (likelihood of performance degradation)
   - **Utilization graphs** - Historical CPU/memory patterns
   - **Finding reason** - Why recommendation was made

5. **Test in non-production:**
   - Never apply recommendations directly to production
   - Test in dev/staging environment first
   - Monitor performance for 1-2 weeks
   - Validate no degradation before production rollout

6. **Implement changes:**
   - Console: Stop instance → Change instance type → Start
   - CLI: `aws ec2 modify-instance-attribute`
   - IaC: Update CloudFormation/Terraform/CDK templates
   - Auto Scaling groups: Update launch template/configuration

**Performance Risk Indicators:**

Compute Optimizer assigns risk levels to recommendations based on workload patterns.

| Risk Level | Description | Action Guidance |
|------------|-------------|-----------------|
| **Very Low** | Extremely conservative downsizing, >90% confidence | Safe to implement immediately |
| **Low** | Conservative recommendation, high confidence | Test briefly, then implement |
| **Medium** | Moderate workload variability detected | Thorough testing required |
| **High** | Significant spikes or unpredictable patterns | Careful evaluation, extended testing |

**Cost Optimization Examples:**

**Example 1: Over-provisioned EC2:**
- Current: m5.4xlarge (16 vCPU, 64 GB RAM) at $560/month
- Utilization: 15% CPU, 25% memory
- Recommendation: m5.xlarge (4 vCPU, 16 GB RAM) at $140/month
- Savings: $420/month (75% reduction)
- Performance risk: Very Low

**Example 2: Under-provisioned Lambda:**
- Current: 512 MB memory, 2,000ms average duration
- Memory utilization: 480 MB (94% utilization)
- Recommendation: 1,024 MB memory (reduces duration to 1,000ms due to proportional CPU increase)
- Cost impact: +$2/month in Lambda charges, but saves $10/month in execution time reduction
- Net savings: $8/month + improved performance

**Example 3: EBS Volume Optimization:**
- Current: io2 volume with 10,000 provisioned IOPS
- Actual utilization: 2,000 IOPS average, 3,500 IOPS peak
- Recommendation: gp3 volume with 3,000 provisioned IOPS, 125 MB/s throughput
- Savings: $450/month (70% reduction)
- Performance risk: Low (gp3 meets actual IOPS requirements)

**Real-World Scenario:** A company with 500 EC2 instances enabled Compute Optimizer and installed CloudWatch agent on all instances. After 30 days, recommendations showed: 200 instances over-provisioned (avg 20% CPU), 50 under-provisioned (avg 85% CPU), 250 optimized. After implementing rightsizing: $15,000/month savings (28% cost reduction), improved performance on under-provisioned instances, zero performance degradation on downsized instances.

**Compute Optimizer Limitations:**

- **Lookback period:** Only analyzes last 14 days (may miss monthly patterns)
- **Requires CloudWatch agent for memory** - CPU-only analysis incomplete
- **No GPU recommendations** - P3, G4 instances not analyzed
- **No commitment recommendations** - Doesn't suggest Reserved Instances or Savings Plans directly
- **Regional resource** - Must review recommendations per region

**Integration with AWS Organizations:**

When enabled at organization level:
- Management account sees recommendations for all member accounts
- Aggregated savings opportunities across organization
- Centralized reporting for governance

**AWS Documentation:**
- [AWS Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- [Getting Started with Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/getting-started.html)
- [Viewing Recommendations](https://docs.aws.amazon.com/compute-optimizer/latest/ug/viewing-recommendations.html)
- [CloudWatch Agent for Enhanced Metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html)
- [Understanding Performance Risk](https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html#ec2-performance-risk)

## Network Performance Optimization

Network performance optimization reduces latency, increases throughput, and improves reliability by leveraging AWS's global infrastructure and specialized networking features.

### AWS Global Accelerator

Global Accelerator uses AWS's global network infrastructure and anycast IP addresses to route user traffic to optimal application endpoints, improving performance by up to 60% compared to internet routing.

**How Global Accelerator Works:**

1. **Static anycast IPs assigned** - AWS provides 2 static IPv4 addresses from AWS's global anycast network
2. **User requests hit nearest edge location** - Anycast routing directs users to closest AWS edge location (450+ locations)
3. **Traffic stays on AWS network** - Requests routed over AWS private backbone (not public internet)
4. **Health-based routing** - Continuous health checks route traffic only to healthy endpoints
5. **Instant failover** - Traffic automatically rerouted to healthy endpoints within seconds

**Key Features:**

- **Two static anycast IP addresses** - Use same IPs globally, no DNS changes needed
- **AWS global network routing** - Traffic uses AWS backbone (lower latency, higher throughput than internet)
- **Automatic failover** - Health checks every 30 seconds, traffic redirected to healthy endpoints in <30 seconds
- **Traffic dials** - Control percentage of traffic sent to each endpoint group (blue/green deployments, canary releases)
- **Client affinity** - Optional source IP-based session affinity for stateful applications
- **DDoS protection** - AWS Shield Standard included (Shield Advanced available)
- **Performance improvement** - 60% average latency reduction for global users
- **Protocol support** - TCP, UDP (Layer 4)

**Global Accelerator vs. CloudFront:**

| Feature | Global Accelerator | CloudFront |
|---------|-------------------|------------|
| **Primary Use Case** | TCP/UDP applications, gaming, IoT, VoIP | HTTP/HTTPS content delivery, web applications |
| **Caching** | No caching (proxies packets) | Caches content at edge locations |
| **IP Addresses** | 2 static anycast IPs (don't change) | Dynamic edge IPs (change per location) |
| **Protocol Support** | TCP, UDP (Layer 4) | HTTP, HTTPS, WebSocket (Layer 7) |
| **Endpoint Types** | ALB, NLB, EC2, Elastic IP | S3, ALB, EC2, custom HTTP origins |
| **Failover Mechanism** | Instant health check-based (seconds) | DNS-based (limited by TTL, minutes) |
| **Use for** | Real-time apps, non-HTTP protocols, static IPs | Web content, APIs, video streaming |
| **Client routing** | Anycast to nearest edge → AWS backbone to origin | Anycast to nearest edge → cache or origin |
| **Cost model** | Hourly + data transfer | Data transfer + HTTP requests |

**When to Use Global Accelerator:**
- **Non-HTTP/HTTPS applications** - Gaming, VoIP, IoT (MQTT), custom TCP/UDP protocols
- **Static IP requirement** - Firewall whitelisting, client hardcoded IPs
- **Performance-critical applications** - Need guaranteed AWS backbone routing
- **Global user base** - Users worldwide benefit from edge proximity
- **Instant failover needed** - Can't tolerate DNS propagation delays
- **Stateful applications** - Need consistent endpoint for session affinity

**When to Use CloudFront Instead:**
- **HTTP/HTTPS traffic only** - Web applications, APIs, media delivery
- **Caching benefits desired** - Static content, cacheable API responses
- **Cost optimization** - CloudFront cheaper for cacheable content
- **Lambda@Edge needed** - Custom logic at edge locations
- **Origin flexibility** - S3, custom HTTP origins, media services

**Global Accelerator Architecture:**

```
Global Users → Static Anycast IPs (2 IPs from AWS) →
Nearest AWS Edge Location (450+ locations) →
AWS Global Network (private backbone) →
Endpoint Groups (multi-region):
  ├─ US East: ALB → EC2 instances (80% traffic via dial)
  ├─ US West: NLB → EC2 instances (20% traffic via dial)
  └─ Europe: ALB → ECS Fargate (failover only)
```

**Traffic Dials for Blue/Green and Canary Deployments:**

Traffic dials control the percentage of traffic sent to each endpoint group (0-100%).

```
# Blue/Green Deployment Example
Initial state:
  - Blue (current version): 100% traffic
  - Green (new version): 0% traffic

Step 1: Deploy green environment, set dial to 10%
  - Blue: 90% traffic
  - Green: 10% traffic (canary validation)

Step 2: Increase green traffic gradually
  - Blue: 50% traffic
  - Green: 50% traffic

Step 3: Full cutover
  - Blue: 0% traffic (ready for decommission)
  - Green: 100% traffic
```

**Client Affinity Options:**

| Affinity Setting | Behavior | Use Case |
|------------------|----------|----------|
| **None** | Each request independently routed to optimal endpoint | Stateless applications, APIs |
| **Source IP** | Requests from same source IP always go to same endpoint | Stateful applications, WebSocket connections, session-based apps |

**Real-World Scenario:** A global gaming platform uses EC2 instances in 5 regions (US East, US West, Europe, Asia, South America). Without Global Accelerator: Users routed via DNS geolocation, average latency 150ms, packet loss 2%, manual failover 15 minutes. With Global Accelerator: Anycast IPs route to nearest edge, AWS backbone to closest region, average latency 60ms (60% improvement), packet loss 0.1%, automatic failover 30 seconds.

**AWS Documentation:**
- [AWS Global Accelerator](https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html)
- [How AWS Global Accelerator Works](https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html)
- [Global Accelerator Use Cases](https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-benefits-of-migrating.html)
- [Traffic Dials](https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-traffic-dial.html)

### VPC Endpoints

VPC endpoints enable private connectivity between VPC resources and AWS services without using internet gateways, NAT devices, VPN connections, or AWS Direct Connect. Traffic stays on AWS network, improving security and performance while reducing costs.

**Two Types of VPC Endpoints:**

**1. Interface Endpoints (AWS PrivateLink):**

Interface endpoints create elastic network interfaces (ENIs) with private IP addresses in your VPC subnets, enabling private connectivity to AWS services.

**Technical Details:**
- **Implementation:** Powered by AWS PrivateLink technology
- **Network interface:** Creates ENI in each selected subnet/AZ
- **Private IP:** Assigned from VPC CIDR range
- **DNS resolution:** Service-specific DNS name resolves to private IP (e.g., `vpce-123-xyz.ec2.us-east-1.vpce.amazonaws.com`)
- **Security groups:** Apply security group rules to control access
- **Supported services:** 100+ AWS services (EC2, Lambda, SQS, SNS, Secrets Manager, Systems Manager, ECS, ECR, etc.)
- **Cross-account/cross-VPC:** Supports PrivateLink to services in other accounts

**Pricing:**
- Hourly charge per endpoint per AZ (e.g., $0.01/hour = $7.20/month per AZ)
- Data processing charge (e.g., $0.01/GB processed)
- Example: 3 AZs × $7.20/month + 1 TB data × $10.24 = $31.84/month

**2. Gateway Endpoints:**

Gateway endpoints add a route table target for AWS services, routing traffic directly to the service without ENIs.

**Technical Details:**
- **Implementation:** Route table entry pointing to AWS service prefix list
- **Supported services:** ONLY S3 and DynamoDB (no other services)
- **Highly available:** Redundant, automatically scaled by AWS (no AZ placement needed)
- **Routing:** Added as target in route tables (e.g., `pl-12345 (S3) → vpce-67890`)
- **Security:** Controlled via endpoint policies (IAM-like JSON policies)
- **No data path limits:** No bandwidth constraints, no performance overhead

**Pricing:**
- FREE - No hourly charges
- FREE - No data processing charges
- Only charged for data transfer to/from S3 or DynamoDB (standard S3/DynamoDB pricing)

**Interface Endpoint vs. Gateway Endpoint:**

| Feature | Interface Endpoint | Gateway Endpoint |
|---------|-------------------|------------------|
| **Supported Services** | 100+ services (EC2, Lambda, SQS, etc.) | ONLY S3 and DynamoDB |
| **Implementation** | ENI with private IP in subnet | Route table entry |
| **Availability** | Requires deployment in each AZ | Highly available across all AZs |
| **DNS** | Private DNS name resolves to private IP | Uses service public endpoint DNS |
| **Security** | Security groups + endpoint policies | Endpoint policies only |
| **Cost** | $7.20+/month per AZ + data processing | FREE |
| **On-premises access** | Accessible via Direct Connect/VPN | Accessible via Direct Connect/VPN |
| **Performance** | Good (ENI overhead minimal) | Excellent (no proxy, direct routing) |

**Benefits of VPC Endpoints:**

**1. Cost Reduction:**
```
Without VPC Endpoint (NAT Gateway):
EC2 in private subnet → NAT Gateway → Internet Gateway → S3
Cost: NAT Gateway hourly ($0.045/hour) + data processing ($0.045/GB) = $32.40/month + $46/TB

With Gateway VPC Endpoint:
EC2 in private subnet → VPC Endpoint (route table) → S3
Cost: $0 for endpoint + $0 for data processing
Savings: $32.40/month + $46/TB
```

**2. Improved Security:**
- Traffic never leaves AWS network
- No exposure to internet (no internet gateway in route table)
- Reduce attack surface
- Compliance requirements (data must not traverse internet)

**3. Better Performance:**
- Lower latency (direct AWS network routing vs. internet routing)
- Higher throughput (AWS backbone capacity)
- No NAT gateway bottleneck

**4. Simplified Network Architecture:**
- No need for NAT gateways in private subnets
- Eliminate internet gateway for specific service traffic
- Reduce route table complexity

**Endpoint Policies:**

Endpoint policies are IAM-like JSON policies that control access to services through the endpoint.

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::restricted-bucket/*"
    }
  ]
}
```

**Common Use Cases:**

**Use Case 1: Lambda in VPC accessing S3**
```
Problem: Lambda in VPC needs S3 access
Bad Solution: NAT Gateway → Internet Gateway → S3 (slow, expensive)
Good Solution: S3 Gateway VPC Endpoint (fast, free)

Architecture:
Lambda (in VPC) → VPC Endpoint (S3 Gateway) → S3
Result: Zero cost, lower latency, no internet exposure
```

**Use Case 2: EC2 instances accessing Systems Manager**
```
Problem: EC2 instances in private subnet need Systems Manager (SSM) for patching
Bad Solution: NAT Gateway → Internet Gateway → SSM (costly, internet exposure)
Good Solution: Interface VPC Endpoint for SSM

Architecture:
EC2 (private subnet) → Interface Endpoint (ssm.us-east-1.amazonaws.com) → Systems Manager
Cost: $21.60/month (3 AZs × $7.20) vs. NAT Gateway $32.40/month + data processing
```

**Use Case 3: Microservices accessing SQS/SNS**
```
Problem: ECS containers in private subnets need SQS and SNS
Solution: Interface VPC Endpoints for SQS and SNS

Architecture:
ECS Tasks → SQS Interface Endpoint → Amazon SQS
ECS Tasks → SNS Interface Endpoint → Amazon SNS
Benefit: Private connectivity, no NAT gateway, improved security
```

**Real-World Scenario:** A data processing application with 1,000 EC2 instances in private subnets writes 10 TB/month to S3 and queries DynamoDB. Original architecture: NAT Gateway in each of 3 AZs ($97.20/month) + data processing 10 TB ($460/month) = $557.20/month. New architecture: S3 and DynamoDB Gateway VPC Endpoints. Cost: $0. Monthly savings: $557.20 (100% reduction for S3/DynamoDB traffic).

**Critical Exam Concepts:**
- Gateway endpoints are FREE and ONLY work with S3 and DynamoDB
- Interface endpoints charge hourly + data processing, but support 100+ services
- VPC endpoints improve security (traffic never leaves AWS network)
- Gateway endpoints are highly available automatically (no AZ placement needed)
- Interface endpoints require ENIs in each AZ for high availability
- Endpoint policies provide fine-grained access control

**AWS Documentation:**
- [VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- [Gateway VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpce-gateway.html)
- [Interface VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpce-interface.html)
- [AWS PrivateLink](https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html)
- [Endpoint Policies](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)

### Enhanced Networking and Placement Groups

Enhanced networking and placement groups optimize network performance for latency-sensitive and high-throughput applications.

**EC2 Placement Groups:**

Placement groups influence how EC2 instances are physically located relative to each other, affecting network latency and fault tolerance.

| Placement Group Type | Layout | Use Case | Performance | Availability |
|---------------------|--------|----------|-------------|--------------|
| **Cluster** | All instances in same rack, same AZ | HPC, low-latency applications, big data | Up to 100 Gbps bandwidth, single-digit microsecond latency | Single AZ, single rack (high failure domain risk) |
| **Partition** | Instances spread across logical partitions (different racks) | Large distributed systems (Hadoop, Cassandra, Kafka) | Good network performance | Up to 7 partitions per AZ, partitions isolated from failures |
| **Spread** | Each instance on distinct hardware | Small number of critical instances | Standard network performance | Maximum 7 instances per AZ per group |

**Cluster Placement Group:**
- **Physical layout:** All instances in same low-latency network segment (same rack or adjacent racks)
- **Network performance:** Up to 100 Gbps (with ENA-enabled instance types like c5n.18xlarge)
- **Latency:** Single-digit microsecond latency between instances
- **Best for:** HPC (molecular modeling, genomics), financial modeling, machine learning training, tightly-coupled workloads
- **Limitation:** Single AZ only (no multi-AZ support), capacity errors if AWS can't place all instances together
- **Recommendation:** Launch all instances at once to ensure capacity availability

**Partition Placement Group:**
- **Physical layout:** Instances divided into partitions (up to 7 per AZ), each partition on separate rack with independent network and power
- **Isolation:** Partition failure (rack-level) doesn't affect other partitions
- **Scalability:** Hundreds of instances per group
- **Best for:** Distributed and replicated workloads (HDFS, HBase, Cassandra) where partition-aware placement improves fault tolerance
- **Multi-AZ:** Supported (up to 7 partitions per AZ across multiple AZs)
- **Use with:** Applications that have partition awareness (can distribute data across partitions)

**Spread Placement Group:**
- **Physical layout:** Each instance on distinct hardware (different rack, different network, different power)
- **Maximum isolation:** Hardware failure affects only one instance
- **Limitation:** Maximum 7 running instances per AZ per group
- **Best for:** Small number of critical instances (Active Directory, databases, high-availability pairs)
- **Multi-AZ:** Supported

**Enhanced Networking Technologies:**

Enhanced networking provides higher bandwidth, higher packet-per-second (PPS) performance, and lower inter-instance latencies using single root I/O virtualization (SR-IOV).

**1. Elastic Network Adapter (ENA):**
- **Bandwidth:** Up to 100 Gbps (on c5n.18xlarge, p3dn.24xlarge, and other large instance types)
- **PPS:** Up to 15 million packets per second
- **Latency:** Lower than default VPC networking
- **Availability:** Enabled by default on current-generation instances (C5, M5, R5, etc.)
- **Cost:** No additional charge (included with instance)
- **Use cases:** All high-performance applications, databases, containerized workloads

**2. Elastic Fabric Adapter (EFA):**
- **Technology:** ENA + OS-bypass capability for ultra-low latency
- **Bandwidth:** Up to 100 Gbps
- **Latency:** Microsecond-level latency (MPI inter-node communication)
- **OS-bypass:** Allows HPC applications to bypass OS kernel for direct network interface access
- **Supported protocols:** Libfabric, MPI (Message Passing Interface)
- **Use cases:** HPC (molecular dynamics, computational fluid dynamics, weather modeling), machine learning training at scale
- **Limitation:** Only works within single subnet (can't route beyond subnet)
- **Instance support:** C5n, C6i, M5n, P3dn, P4d instances

**ENA vs. EFA:**

| Feature | ENA | EFA |
|---------|-----|-----|
| **Bandwidth** | Up to 100 Gbps | Up to 100 Gbps |
| **Latency** | Low | Ultra-low (microseconds) |
| **OS-bypass** | No | Yes (for MPI/libfabric traffic) |
| **Use case** | General high-performance networking | HPC, ML training with inter-node communication |
| **Routing** | Works across subnets/VPCs | Single subnet only |
| **Instance support** | All current-generation instances | Select instance types (C5n, P4d, etc.) |

**Network Performance Optimization Techniques:**

**1. Use current-generation instance types:**
- C6i, M6i, R6i (vs. C5, M5, R5) offer better network performance
- Network-optimized instances (C5n, M5n) provide highest bandwidth

**2. Enable enhanced networking (ENA):**
```bash
# Verify ENA is enabled
aws ec2 describe-instances --instance-id i-1234567890abcdef0 --query 'Reservations[0].Instances[0].EnaSupport'

# Enable ENA (if needed)
aws ec2 modify-instance-attribute --instance-id i-1234567890abcdef0 --ena-support
```

**3. Use cluster placement groups for HPC:**
- Place tightly-coupled instances in cluster group
- Ensure instances launched simultaneously (capacity availability)

**4. Leverage jumbo frames (MTU 9001) within VPC:**
- Default MTU: 1500 bytes
- Jumbo frames MTU: 9001 bytes (6x larger, reduces overhead)
- Enable in VPC for better throughput (inter-instance traffic only, not internet-bound)

```bash
# Set MTU on Linux instance
sudo ip link set dev eth0 mtu 9001
```

**5. Use multiple ENIs for traffic separation:**
- Management traffic on eth0
- Application traffic on eth1
- Storage traffic on eth2
- Total bandwidth distributed across ENIs

**Real-World Scenario:** A financial services firm runs Monte Carlo simulations for risk analysis. Original setup: M5.large instances (up to 10 Gbps) in default placement, 500ms per simulation iteration. Optimized setup: C5n.18xlarge instances (100 Gbps) in cluster placement group with EFA enabled, MTU 9001. Result: 50ms per iteration (10x faster), 90% cost reduction due to faster completion.

**AWS Documentation:**
- [Placement Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html)
- [Enhanced Networking on Linux](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html)
- [Elastic Network Adapter (ENA)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking-ena.html)
- [Elastic Fabric Adapter](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html)
- [Network Performance in EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html)

## Application Performance Monitoring

Application performance monitoring provides visibility into microservices architectures, enabling rapid identification of bottlenecks, errors, and performance degradation across distributed systems.

### AWS X-Ray

AWS X-Ray provides end-to-end distributed tracing for microservices applications, helping identify performance bottlenecks, analyze request flows, and debug errors across service boundaries.

**How X-Ray Works:**

1. **Application instrumentation:** X-Ray SDK added to application code
2. **Trace data generation:** SDK captures request data, downstream calls, errors, latency
3. **Daemon transmission:** X-Ray daemon batches and sends trace data to X-Ray service
4. **Service map generation:** X-Ray analyzes traces and builds visual service map
5. **Query and analysis:** Search traces, filter by criteria, analyze performance patterns

**Key Concepts:**

| Concept | Description | Use Case |
|---------|-------------|----------|
| **Trace** | Complete end-to-end request path through all services | Understand full request lifecycle (API Gateway → Lambda → DynamoDB) |
| **Segment** | Data about work done by single service/resource | Measure time spent in specific Lambda function or EC2 instance |
| **Subsegment** | Granular detail within segment (DB calls, HTTP requests, AWS SDK calls) | Identify slow database query or external API call within service |
| **Annotation** | Indexed key-value pairs (searchable, filterable) | Filter traces by customer ID, transaction type, API version |
| **Metadata** | Non-indexed additional data (not searchable) | Store request/response payloads, configuration data for debugging |
| **Sampling** | Percentage of requests to trace (default: 1 request/sec + 5%) | Balance between visibility and cost/performance overhead |

**X-Ray Daemon:**

The X-Ray daemon is a lightweight UDP listener that batches and forwards trace data to the X-Ray service.

- **Protocol:** Listens on UDP port 2000
- **Buffering:** Batches segments to reduce API calls
- **Deployment:**
  - **EC2/On-premises:** Install daemon manually, runs as background service
  - **ECS:** Run daemon as sidecar container or on host
  - **Lambda:** Built-in (no daemon needed, enable Active Tracing)
  - **Elastic Beanstalk:** Built-in (daemon pre-installed)
- **IAM permissions:** Requires `xray:PutTraceSegments` and `xray:PutTelemetryRecords`

**Integration Steps:**

**1. Instrument application:**
```python
# Python example with X-Ray SDK
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

# Patch all supported libraries (boto3, requests, etc.)
patch_all()

@xray_recorder.capture('process_order')
def process_order(order_id):
    # Add annotation (indexed, searchable)
    xray_recorder.put_annotation('order_id', order_id)

    # Add metadata (not indexed)
    xray_recorder.put_metadata('order_details', {'items': 3, 'total': 125.50})

    # Subsegment automatically created for this database call
    result = dynamodb.query(...)
    return result
```

**2. Deploy X-Ray daemon:**
```bash
# Install daemon on Amazon Linux 2
sudo yum install -y aws-xray-daemon

# Start daemon
sudo service xray start

# Verify daemon is listening on port 2000
sudo netstat -tuln | grep 2000
```

**3. Enable active tracing:**
- **Lambda:** Function configuration → Enable Active Tracing
- **API Gateway:** Stage settings → Enable X-Ray Tracing
- **ECS:** Task definition → Enable X-Ray integration
- **App Runner:** Configuration → Enable X-Ray tracing

**4. View service map and traces:**
- X-Ray Console → Service Map (visual topology)
- X-Ray Console → Traces (individual request details)
- Filter by annotation: `annotation.customer_id = "12345"`
- Filter by error: `error = true`
- Filter by latency: `responsetime > 5`

**X-Ray Service Map:**

The service map visualizes application architecture with real-time performance metrics.

**Service Map Components:**
- **Nodes:** Services in architecture (Lambda, EC2, RDS, DynamoDB, etc.)
- **Edges:** Connections between services (HTTP calls, SDK calls)
- **Colors:**
  - Green: Healthy service (no errors)
  - Yellow: Elevated errors (5XX responses)
  - Red: High error rate
- **Metrics per node:**
  - Average response time
  - Requests per minute
  - Error rate (4XX, 5XX, fault)
  - Throttle rate

**Analyzing Performance with X-Ray:**

**Use Case 1: Slow API Response**
1. Service map shows Lambda → DynamoDB edge with high latency (2 seconds)
2. Click edge to view trace details
3. Traces show DynamoDB query subsegment taking 1.9 seconds
4. Root cause: Missing GSI, Scan operation instead of Query
5. Fix: Create GSI on queried attribute
6. Result: Latency drops to 50ms

**Use Case 2: Intermittent Errors**
1. Filter traces: `error = true AND service(payment-api)`
2. Review traces to find pattern
3. Annotations show errors only for `payment_type = "crypto"`
4. Root cause: External crypto payment API timeout after 5 seconds
5. Fix: Increase timeout, add retry logic
6. Result: Error rate drops from 15% to 0.5%

**Sampling Strategies:**

X-Ray sampling balances visibility with cost and performance impact.

**Default Sampling Rule:**
- **Reservoir:** 1 request per second (always traced)
- **Rate:** 5% of additional requests
- **Example:** 100 req/sec = 1 (reservoir) + 5 (5% of remaining 99) = 6 traced requests/sec

**Custom Sampling Rules:**
```json
{
  "rules": [
    {
      "description": "Trace all errors",
      "priority": 100,
      "version": 1,
      "service_name": "*",
      "http_method": "*",
      "url_path": "*",
      "fixed_rate": 1.0,
      "attributes": {
        "error": "true"
      }
    },
    {
      "description": "Trace premium customers at higher rate",
      "priority": 200,
      "version": 1,
      "service_name": "order-api",
      "http_method": "*",
      "url_path": "/orders/*",
      "fixed_rate": 0.5,
      "attributes": {
        "customer_tier": "premium"
      }
    }
  ]
}
```

**X-Ray Pricing:**
- **Traces recorded:** $5.00 per 1 million
- **Traces retrieved/scanned:** $0.50 per 1 million
- **Free tier:** 100,000 traces/month recorded, 1 million traces retrieved
- **Example:** 10 million requests/month, 5% sampling = 500,000 traces = $2.00/month

**AWS Documentation:**
- [AWS X-Ray](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)
- [X-Ray Concepts](https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html)
- [X-Ray Daemon](https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html)
- [Instrumenting Your Application](https://docs.aws.amazon.com/xray/latest/devguide/xray-instrumenting-your-app.html)
- [X-Ray Sampling](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html)

### CloudWatch Application Insights

CloudWatch Application Insights automatically discovers application components, monitors key metrics, and detects common problems in .NET, SQL Server, and Java applications.

**How Application Insights Works:**

1. **Resource discovery:** Automatically identifies application components (EC2, RDS, ELB, Auto Scaling groups)
2. **Metric selection:** Recommends CloudWatch metrics and alarms based on application type
3. **Problem detection:** Uses machine learning to detect anomalies and common failure patterns
4. **Dashboard creation:** Auto-generates CloudWatch dashboards with relevant metrics
5. **Root cause analysis:** Correlates metrics across components to identify problem source

**Supported Application Technologies:**

| Technology | Components Monitored | Common Problems Detected |
|------------|---------------------|--------------------------|
| **SQL Server on EC2/RDS** | RDS instance, EC2, ELB, Auto Scaling | High CPU, memory pressure, slow queries, deadlocks |
| **.NET on IIS** | EC2, ELB, Auto Scaling, App Pool | Memory leaks, thread pool exhaustion, failed requests |
| **Java** | EC2, ELB, Auto Scaling, JVM | Memory leaks, GC issues, thread deadlocks |
| **Custom applications** | Any CloudWatch metric sources | User-defined anomaly patterns |

**Key Features:**

**1. Automated Discovery:**
- Scans resource groups or tag-based groupings
- Identifies application tier architecture (web, app, database)
- Maps dependencies between components

**2. Built-in Problem Patterns:**
- SQL Server: Blocked queries, high I/O wait, low page life expectancy
- IIS: Application pool crashes, high request queue length
- JVM: OutOfMemoryError, excessive GC time
- Infrastructure: Instance failures, ELB health check failures

**3. CloudWatch Logs Integration:**
- Automatically creates Logs Insights queries for detected problems
- Correlates log entries with performance degradation
- Identifies error patterns in application logs

**4. Deployment Event Correlation:**
- Detects when problems coincide with deployments (CodeDeploy, Elastic Beanstalk)
- Helps identify problematic releases

**Configuration Example:**

```bash
# Create application in Application Insights
aws application-insights create-application \
  --resource-group-name my-app-resource-group \
  --ops-center-enabled \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:app-alerts

# Application Insights automatically:
# - Discovers EC2, RDS, ELB resources
# - Configures recommended CloudWatch alarms
# - Creates dashboard with key metrics
# - Enables problem detection
```

**Benefits:**

- **Reduced MTTR:** Faster problem identification (avg 60% reduction in detection time)
- **Proactive monitoring:** Detects issues before customer impact
- **No manual configuration:** Auto-configures metrics and alarms
- **Unified view:** Single dashboard for application health

**Real-World Scenario:** A .NET application on EC2 experiences intermittent slowdowns. Without Application Insights: Manual correlation of EC2 CPU, ELB latency, RDS metrics takes 2 hours to identify memory leak. With Application Insights: Problem detected automatically within 5 minutes, root cause identified as .NET memory leak pattern, recommended remediation provided (restart app pool).

**AWS Documentation:**
- [CloudWatch Application Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-application-insights.html)
- [Supported Components and Problems](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/appinsights-components-and-problems.html)
- [Getting Started with Application Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/appinsights-getting-started.html)

## Exam Tips for SAP-C02

**CloudFront and Caching:**
1. **Cache key composition** - Include ONLY necessary components (query strings, headers, cookies) to maximize hit ratio. Each unique combination creates separate cached object.
2. **Cache vs. origin request policies** - Cache policy defines what's in cache key, origin request policy defines what's sent to origin. Separation allows caching identical content while passing extra metadata to origin.
3. **Invalidations are costly** - First 1,000 paths/month free, then $0.005/path. Use versioned filenames (style.abc123.css) instead for zero cost and instant updates.
4. **Wildcard invalidations** - `/images/*` counts as ONE path, not one per file.

**ElastiCache:**
5. **Redis vs. Memcached** - Choose Redis for persistence, complex data types, pub/sub, transactions, replication. Choose Memcached for simple key-value, multi-threaded performance.
6. **Redis cluster mode** - Cluster disabled: single shard, limited to single node memory. Cluster enabled: horizontal sharding, up to 500 nodes, write scaling.
7. **Caching strategies** - Lazy loading: cache miss penalty but only caches requested data. Write-through: higher write latency but always current cache. Always set TTL to prevent unbounded growth.

**DynamoDB:**
8. **DAX is DynamoDB-specific** - Drop-in replacement (change endpoint only), write-through cache, microsecond latency. Does NOT support strongly consistent reads. Must be in VPC.
9. **Partition key design** - High cardinality (millions of unique values) prevents hot partitions. Avoid low-cardinality keys (status, date, type).
10. **GSI vs. LSI** - GSIs can be added/removed anytime, have separate capacity, eventually consistent only. LSIs must be created at table creation, share capacity, support strongly consistent reads.
11. **DynamoDB capacity modes** - On-demand for unpredictable/spiky traffic (higher per-request cost). Provisioned for steady traffic (30-60% cheaper at scale with auto-scaling).

**RDS:**
12. **RDS read replicas** - Asynchronous replication (eventual consistency), up to 15 for Aurora, 5 for other engines. Can be cross-region for DR.
13. **RDS Proxy** - Connection pooling for serverless (Lambda, Fargate), reduces connection overhead, 25x faster failover than DNS.
14. **Performance Insights** - Requires 14+ days for analysis, visualizes DB load vs. capacity, identifies top SQL and wait events.

**Compute:**
15. **Compute Optimizer** - Requires 14+ days of metrics, CloudWatch agent for memory metrics (not collected by default), provides rightsizing recommendations with performance risk levels.

**Network:**
16. **Global Accelerator vs. CloudFront** - Global Accelerator for TCP/UDP, static anycast IPs, non-HTTP protocols (gaming, VoIP). CloudFront for HTTP/HTTPS, content caching, dynamic IPs.
17. **Gateway endpoints are FREE** - Only for S3 and DynamoDB, no hourly or data processing charges. Highly available automatically.
18. **Interface endpoints cost money** - $7.20/month per AZ + data processing, but save NAT gateway costs and improve security (traffic stays on AWS network).
19. **Placement groups** - Cluster for HPC (same AZ, low latency). Partition for distributed systems (up to 7 partitions, rack isolation). Spread for critical instances (max 7 per AZ, distinct hardware).
20. **ENA vs. EFA** - ENA for general enhanced networking (up to 100 Gbps), included free. EFA adds OS-bypass for HPC/MPI (ultra-low latency), requires specific instance types.

**Monitoring:**
21. **X-Ray daemon** - Listens on UDP port 2000, required for EC2 and ECS. Built into Lambda and Elastic Beanstalk (no daemon needed).
22. **X-Ray annotations vs. metadata** - Annotations are indexed and searchable (filter traces). Metadata is not indexed (debugging context only).
23. **X-Ray sampling** - Default: 1 request/sec reservoir + 5% of additional requests. Balance between visibility and cost.

**Common Exam Scenarios:**

**Scenario: High CloudFront costs from frequent invalidations**
- **Solution:** Use versioned filenames instead (e.g., logo.v2.png, script.abc123.js). Zero cost, instant cache updates.

**Scenario: Lambda exhausting RDS connections during traffic spikes**
- **Solution:** RDS Proxy for connection pooling. Maintains warm pool, multiplexes Lambda requests through fewer database connections.

**Scenario: DynamoDB throttling despite adequate provisioned capacity**
- **Solution:** Check partition key design. Low-cardinality partition keys (status, type, date) create hot partitions. Use high-cardinality keys (user_id, device_id).

**Scenario: EC2 in private subnet needs S3 access**
- **Solution:** S3 Gateway VPC Endpoint (free, no NAT gateway needed). Add endpoint to route table, update bucket policy if needed.

**Scenario: Global application needs static IPs and sub-100ms latency**
- **Solution:** AWS Global Accelerator with multi-region endpoint groups. Static anycast IPs, AWS backbone routing, health-based failover.

## Common Architectural Patterns for SAP-C02

### Multi-Tier Caching Architecture

Layered caching at edge, application, and database tiers maximizes cache hit ratios and minimizes origin load.

```
Users →
CloudFront (Edge caching - static content, 1-year TTL) →
ALB →
Application Servers →
ElastiCache Redis (Application caching - API responses, session data) →
RDS Read Replica (Database reads - analytics, reporting) →
RDS Primary (Database writes)
```

**Performance Characteristics:**
- **Edge layer:** 90%+ cache hit ratio for static assets (images, CSS, JS), <50ms global latency
- **Application layer:** 80%+ cache hit ratio for API responses, <5ms latency from in-memory cache
- **Database layer:** 70% read traffic to replicas, <10ms query latency

**Benefits:**
- Reduced origin requests by 85-95%
- Global users experience <100ms page load times
- Database primary handles only writes and uncached reads
- Cost reduction: 60% lower data transfer and database costs

**Implementation Considerations:**
- CloudFront cache policies: Separate behaviors for static (long TTL) vs. dynamic content (short TTL)
- ElastiCache: Lazy loading for reads, write-through for critical data
- RDS: Monitor replica lag (should be <5 seconds)
- Cache invalidation strategy: Version static assets, TTL-based for dynamic content

### Global Multi-Region Application Architecture

High-performance global applications with active-active multi-region deployment and sub-100ms latency worldwide.

```
Global Users →
Route 53 (Geolocation or Latency-based routing) →
AWS Global Accelerator (Static anycast IPs, AWS backbone) →
Regional Endpoints (3+ regions):
  ├─ Region 1 (US East): ALB → ECS Fargate → ElastiCache → Aurora (Primary)
  ├─ Region 2 (Europe): ALB → ECS Fargate → ElastiCache → Aurora (Read Replica)
  └─ Region 3 (Asia): ALB → ECS Fargate → ElastiCache → Aurora (Read Replica)
Aurora Global Database (Cross-region replication <1 second)
```

**Performance Characteristics:**
- **Global latency:** <100ms for 95% of users worldwide
- **Failover time:** <30 seconds (Global Accelerator health checks)
- **Database replication lag:** <1 second cross-region
- **Regional isolation:** Each region can operate independently

**Benefits:**
- 60% latency reduction vs. single-region deployment
- Automatic multi-region failover
- Data locality compliance (GDPR, data residency)
- Regional disaster recovery

**Key Decisions:**
- **Global Accelerator vs. CloudFront:** Use Global Accelerator for static IPs and instant failover (CloudFront for additional edge caching)
- **Active-active vs. active-passive:** Active-active for global load distribution, active-passive for DR only
- **Database:** Aurora Global Database for <1s replication, or DynamoDB Global Tables for multi-master writes
- **Route 53 routing:** Geolocation for data residency, latency-based for best performance

### Serverless High-Performance Pattern

Fully serverless architecture optimized for cost, scalability, and performance.

```
Users →
CloudFront (Edge caching, Lambda@Edge for personalization) →
API Gateway (Regional, caching enabled) →
Lambda (Provisioned concurrency for consistent latency, VPC for DB access) →
VPC Endpoints (S3 Gateway, DynamoDB Interface - no NAT gateway) →
  ├─ S3 (Static data, versioned objects)
  └─ DynamoDB (Application data) → DAX (Microsecond read caching)
```

**Performance Characteristics:**
- **Cold start elimination:** Provisioned concurrency keeps Lambda warm
- **Sub-millisecond DynamoDB reads:** DAX caching layer
- **Zero NAT gateway latency:** VPC endpoints for private AWS service access
- **API Gateway caching:** 300-second TTL reduces Lambda invocations by 70%

**Benefits:**
- No server management overhead
- Automatic scaling to millions of requests
- Cost optimization: Pay only for usage
- <100ms p99 latency with proper configuration

**Optimization Techniques:**
1. **Provisioned concurrency:** Pre-warm 10-20% of expected concurrent Lambda executions
2. **API Gateway caching:** Enable for GET requests with 300-second TTL
3. **DAX cluster:** 3-node minimum for HA, t3.small for dev, r6g.large for production
4. **VPC endpoints:** S3 Gateway (free), DynamoDB Interface if in VPC
5. **DynamoDB on-demand:** For unpredictable traffic, or provisioned with auto-scaling for steady load
6. **Lambda memory optimization:** Use Compute Optimizer or AWS Lambda Power Tuning tool

**Cost Comparison (1M requests/month):**
- Without optimization: API Gateway $3.50 + Lambda $0.20 (cold starts) + NAT Gateway $32.40 = $36.10/month
- With optimization: API Gateway $3.50 + Lambda $0.20 + VPC endpoints $21.60 + DAX $50 - API Gateway cache savings $2.45 = $72.85/month (but 10x faster, better UX)
- At 10M requests/month: Optimized architecture becomes 40% cheaper due to cache efficiency

### High-Performance Computing (HPC) Pattern

Optimized for tightly-coupled parallel workloads requiring ultra-low latency inter-node communication.

```
Job Scheduler (AWS Batch or Custom) →
Cluster Placement Group (Single AZ, same rack) →
C5n.18xlarge instances (100 Gbps ENA, EFA enabled) →
  ├─ MPI applications with libfabric (OS-bypass)
  ├─ Shared storage: FSx for Lustre (parallel file system)
  └─ Results → S3 (via VPC Endpoint)
```

**Performance Characteristics:**
- **Inter-node latency:** <10 microseconds (EFA OS-bypass)
- **Bandwidth:** 100 Gbps per instance
- **Storage throughput:** 1+ GB/s per TiB with FSx for Lustre
- **Scalability:** Hundreds of nodes in cluster placement group

**Use Cases:**
- Computational fluid dynamics (CFD)
- Molecular dynamics simulations
- Weather modeling
- Machine learning training (large models requiring multi-node)

**Critical Configuration:**
- Launch all instances simultaneously (avoid capacity fragmentation)
- Use latest-generation compute-optimized or memory-optimized instances with EFA support
- Enable jumbo frames (MTU 9001) for maximum throughput
- FSx for Lustre linked to S3 for data staging

**AWS Documentation:**
- [Well-Architected Performance Efficiency Pillar](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html)
- [Caching Best Practices](https://aws.amazon.com/caching/best-practices/)
- [Performance at Scale with Amazon ElastiCache (Whitepaper)](https://docs.aws.amazon.com/whitepapers/latest/performance-at-scale-with-elasticache/welcome.html)
- [Database Caching Strategies Using Redis (Whitepaper)](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/welcome.html)
