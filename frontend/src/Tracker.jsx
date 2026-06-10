import { useState, useEffect, useRef, useCallback } from "react";

const CURRICULUM = [
  {
    id: "core-java",
    section: "Core Java",
    icon: "☕",
    color: "#f59e0b",
    topics: [
      {
        id: "jvm-architecture",
        title: "JVM Architecture",
        subtopics: [
          "Class Loader Subsystem",
          "Runtime Data Areas (Heap, Stack, Method Area, PC Register, Native Stack)",
          "Execution Engine (Interpreter, JIT Compiler, Garbage Collector)",
          "Native Method Interface (JNI)",
          "Bootstrap vs Extension vs Application ClassLoader",
          "ClassLoader delegation model",
          "bytecode verification",
        ],
      },
      {
        id: "oop",
        title: "OOP Fundamentals",
        subtopics: [
          "Classes & Objects",
          "Constructors & Initialization blocks",
          "this & super keywords",
          "Inheritance (single, multilevel)",
          "Method Overriding vs Overloading",
          "Polymorphism (compile-time vs runtime)",
          "Encapsulation & access modifiers",
          "Abstraction — abstract classes",
          "Interfaces — default & static methods",
          "Interface vs Abstract Class tradeoffs",
          "Composition over Inheritance",
          "final keyword — class, method, variable",
          "Object class methods (equals, hashCode, toString, clone)",
        ],
      },
      {
        id: "exception-handling",
        title: "Exception Handling",
        subtopics: [
          "Checked vs Unchecked exceptions",
          "Exception hierarchy (Throwable → Error vs Exception)",
          "try-catch-finally",
          "try-with-resources",
          "Multi-catch blocks",
          "Custom exceptions",
          "Exception chaining (initCause, getCause)",
          "Rethrowing exceptions",
          "When NOT to use exceptions",
        ],
      },
      {
        id: "generics",
        title: "Generics",
        subtopics: [
          "Why generics (type erasure problem before generics)",
          "Generic classes & methods",
          "Bounded type parameters (<T extends Comparable>)",
          "Wildcards: ?, ? extends T, ? super T",
          "PECS principle (Producer Extends, Consumer Super)",
          "Type erasure internals",
          "Generic interfaces",
          "Reifiable vs non-reifiable types",
        ],
      },
      {
        id: "collections",
        title: "Collections Framework",
        subtopics: [
          "Collection hierarchy (Iterable → Collection → List/Set/Queue)",
          "ArrayList vs LinkedList internals & tradeoffs",
          "HashMap internals (hashing, buckets, load factor, resize)",
          "HashMap vs LinkedHashMap vs TreeMap",
          "HashSet vs LinkedHashSet vs TreeSet",
          "ArrayDeque vs LinkedList as Queue/Stack",
          "PriorityQueue internals",
          "ConcurrentHashMap vs Collections.synchronizedMap",
          "WeakHashMap, IdentityHashMap, EnumMap",
          "Fail-fast vs Fail-safe iterators",
          "Comparable vs Comparator",
          "Collections utility class",
          "Unmodifiable vs Immutable collections",
          "Arrays.asList vs List.of tradeoffs",
        ],
      },
      {
        id: "multithreading",
        title: "Multithreading & Concurrency",
        subtopics: [
          "Thread lifecycle (NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED)",
          "Creating threads: Thread vs Runnable vs Callable",
          "Race conditions — what causes them",
          "synchronized keyword (method vs block)",
          "volatile keyword — visibility vs atomicity",
          "Locks: ReentrantLock, ReadWriteLock, StampedLock",
          "Deadlock, Livelock, Starvation",
          "wait(), notify(), notifyAll()",
          "Thread pools: Executors, ExecutorService",
          "Future, CompletableFuture",
          "CountDownLatch, CyclicBarrier, Semaphore, Phaser",
          "Atomic classes (AtomicInteger, AtomicReference)",
          "ThreadLocal",
          "Fork/Join framework",
          "Virtual Threads (Project Loom)",
          "Structured Concurrency (Java 21+)",
          "java.util.concurrent package overview",
        ],
      },
      {
        id: "memory-jvm",
        title: "Memory Management & Profiling",
        subtopics: [
          "Heap regions: Young Gen (Eden, S0, S1), Old Gen, Metaspace",
          "GC algorithms: Serial, Parallel, CMS, G1, ZGC, Shenandoah",
          "Minor GC vs Major GC vs Full GC",
          "GC tuning flags (-Xms, -Xmx, -XX:NewRatio)",
          "Memory leaks — common causes (static refs, listeners, caches)",
          "Heap dumps & analyzing with MAT / VisualVM",
          "Thread dumps & analyzing deadlocks",
          "JVM profiling tools: JFR, JMC, Async-profiler",
          "Off-heap memory, DirectByteBuffer",
          "OutOfMemoryError types and causes",
          "Finalization & Phantom/Weak/Soft references",
        ],
      },
      {
        id: "java-streams",
        title: "Java Streams API",
        subtopics: [
          "Stream pipeline: source → intermediate → terminal",
          "Lazy evaluation — why it matters",
          "map vs flatMap",
          "filter, reduce, collect",
          "Collectors: toList, groupingBy, partitioningBy, joining",
          "Stream.of, Arrays.stream, Collection.stream",
          "Parallel streams — when to use, when NOT to",
          "Infinite streams: iterate, generate",
          "Optional — avoiding NPE",
          "Primitive streams: IntStream, LongStream, DoubleStream",
          "Stream vs Collection tradeoffs",
          "Custom Collectors",
        ],
      },
      {
        id: "java-io",
        title: "Java I/O API",
        subtopics: [
          "Byte streams vs Character streams",
          "InputStream / OutputStream hierarchy",
          "Reader / Writer hierarchy",
          "BufferedReader, BufferedWriter",
          "FileInputStream, FileOutputStream",
          "ObjectInputStream / ObjectOutputStream (Serialization)",
          "Serialization pitfalls (serialVersionUID, transient)",
          "NIO: Path, Files, FileSystem",
          "NIO Channels & Buffers",
          "WatchService for file changes",
          "Memory-mapped files",
          "NIO.2 async file I/O",
        ],
      },
      {
        id: "annotations",
        title: "Annotations",
        subtopics: [
          "Built-in annotations (@Override, @Deprecated, @SuppressWarnings)",
          "Meta-annotations (@Retention, @Target, @Documented, @Inherited)",
          "Custom annotation creation",
          "Retention policies (SOURCE, CLASS, RUNTIME)",
          "Annotation processing at compile time (APT)",
          "Reflection-based annotation processing at runtime",
          "Repeatable annotations",
        ],
      },
      {
        id: "records",
        title: "Records & Modern Java Types",
        subtopics: [
          "Records — immutable data carriers",
          "Record components & compact constructors",
          "Record vs class vs Lombok @Value tradeoffs",
          "Sealed classes & interfaces",
          "Pattern matching for instanceof",
          "Pattern matching in switch (Java 21)",
          "Text blocks",
          "var (local variable type inference)",
        ],
      },
      {
        id: "jdbc",
        title: "JDBC",
        subtopics: [
          "JDBC architecture (Driver, Connection, Statement, ResultSet)",
          "DriverManager vs DataSource",
          "PreparedStatement vs Statement (SQL injection)",
          "CallableStatement for stored procedures",
          "Connection pooling (HikariCP, c3p0)",
          "Transaction management (commit, rollback, savepoints)",
          "Batch updates",
          "ResultSet types and concurrency",
          "CLOB, BLOB handling",
          "JDBC 4.x auto-loading drivers",
        ],
      },
    ],
  },
  {
    id: "advanced-java",
    section: "Advanced Java",
    icon: "🔧",
    color: "#8b5cf6",
    topics: [
      {
        id: "servlets",
        title: "Servlets",
        subtopics: [
          "Servlet lifecycle (init, service, destroy)",
          "HttpServlet, doGet, doPost",
          "ServletContext vs ServletConfig",
          "HttpSession management",
          "Cookies",
          "Filters & Filter chains",
          "Listeners (ServletContextListener, HttpSessionListener)",
          "Request dispatching (forward vs redirect)",
          "Async servlets (Servlet 3.0+)",
          "Multipart file upload",
        ],
      },
      {
        id: "jsp",
        title: "JSP",
        subtopics: [
          "JSP lifecycle",
          "Directives: page, include, taglib",
          "Scriptlets, Expressions, Declarations",
          "JSTL (core, fmt, sql, xml tags)",
          "EL (Expression Language)",
          "Custom tag libraries",
          "JSP → Servlet compilation",
          "MVC pattern with Servlets + JSP",
        ],
      },
      {
        id: "tomcat",
        title: "Tomcat Internals",
        subtopics: [
          "Tomcat architecture (Server, Service, Connector, Container)",
          "Catalina engine",
          "Host, Context, Wrapper hierarchy",
          "Coyote HTTP connector",
          "ClassLoader hierarchy in Tomcat",
          "server.xml, web.xml, context.xml",
          "Valve pipeline",
          "JNDI resources in Tomcat",
          "Tomcat clustering & session replication",
          "Tuning thread pool (Executor)",
        ],
      },
    ],
  },
  {
    id: "java-evolution",
    section: "Java Evolution",
    icon: "🚀",
    color: "#10b981",
    topics: [
      {
        id: "java8",
        title: "Java 8",
        subtopics: [
          "Lambda expressions",
          "Functional interfaces (Function, Predicate, Supplier, Consumer, BiFunction)",
          "Method references (static, instance, constructor)",
          "Stream API",
          "Optional",
          "Default & static methods in interfaces",
          "New Date/Time API (LocalDate, LocalDateTime, ZonedDateTime, Duration, Period)",
          "Nashorn JS engine",
          "CompletableFuture",
          "Base64 encoding built-in",
        ],
      },
      {
        id: "java11",
        title: "Java 9–11",
        subtopics: [
          "Java 9: Module System (JPMS) — problem it solved",
          "Java 9: jshell REPL",
          "Java 9: Collection factory methods (List.of, Map.of)",
          "Java 9: Stream enhancements (takeWhile, dropWhile, iterate)",
          "Java 10: var — local variable type inference",
          "Java 10: Unmodifiable collection copies",
          "Java 11: String methods (isBlank, lines, strip, repeat)",
          "Java 11: Files.readString, writeString",
          "Java 11: HTTP Client (async, HTTP/2)",
          "Java 11: Running single-file programs",
        ],
      },
      {
        id: "java17",
        title: "Java 12–17",
        subtopics: [
          "Java 12: Switch expressions (preview)",
          "Java 13: Text blocks (preview)",
          "Java 14: Pattern matching for instanceof (preview)",
          "Java 14: Records (preview)",
          "Java 14: NullPointerException messages improvement",
          "Java 15: Sealed classes (preview)",
          "Java 16: Records & pattern matching (final)",
          "Java 17: Sealed classes (final), Random enhancements",
          "Java 17: Deprecations & removals (Security Manager)",
          "Java 17 LTS significance",
        ],
      },
      {
        id: "java21",
        title: "Java 18–21",
        subtopics: [
          "Java 18: Simple Web Server",
          "Java 19: Virtual Threads (preview)",
          "Java 19: Structured Concurrency (preview)",
          "Java 20: Scoped Values (preview)",
          "Java 21: Virtual Threads (final) — how they differ from platform threads",
          "Java 21: Structured Concurrency (preview)",
          "Java 21: Sequenced Collections",
          "Java 21: Pattern matching in switch (final)",
          "Java 21: Record patterns",
          "Java 21 LTS significance",
        ],
      },
      {
        id: "java25",
        title: "Java 22–25",
        subtopics: [
          "Java 22: Unnamed Variables & Patterns",
          "Java 22: Stream Gatherers (preview)",
          "Java 23: Primitive types in patterns (preview)",
          "Java 24: Ahead-of-Time compilation class data sharing",
          "Java 24: Quantum-resistant cryptography",
          "Java 25: Stable Virtual Threads ecosystem",
          "Java 25: Value Objects (preview — Valhalla)",
          "Java 25 LTS significance",
          "Project Valhalla: value types — motivation & tradeoffs",
          "Project Panama: Foreign Function & Memory API",
        ],
      },
    ],
  },
  {
    id: "dsa",
    section: "DSA",
    icon: "🧩",
    color: "#ef4444",
    topics: [
      {
        id: "arrays-strings",
        title: "Arrays & Strings",
        subtopics: [
          "Two pointers technique",
          "Sliding window",
          "Prefix sums",
          "Kadane's algorithm",
          "String manipulation (in-place, StringBuilder)",
          "Sorting: QuickSort, MergeSort, HeapSort internals",
          "Searching: Binary search variants",
          "Matrix traversal patterns",
        ],
      },
      {
        id: "linked-lists",
        title: "Linked Lists",
        subtopics: [
          "Singly, Doubly, Circular",
          "Fast & slow pointer (Floyd's cycle detection)",
          "Reversal techniques",
          "Merge sorted lists",
          "LRU Cache implementation",
        ],
      },
      {
        id: "stacks-queues",
        title: "Stacks & Queues",
        subtopics: [
          "Monotonic stack pattern",
          "Min/Max stack",
          "Queue using two stacks",
          "Deque patterns",
          "BFS using queue",
        ],
      },
      {
        id: "trees",
        title: "Trees & Heaps",
        subtopics: [
          "Binary tree traversals (pre/in/post/level order)",
          "BST: insertion, deletion, search, validation",
          "AVL trees (concept + rotations)",
          "Red-Black trees (concept)",
          "Trie (prefix tree)",
          "Segment tree",
          "Fenwick tree (BIT)",
          "Heap: min-heap, max-heap, heapify",
          "K-way merge pattern",
        ],
      },
      {
        id: "graphs",
        title: "Graphs",
        subtopics: [
          "Representation: adjacency list vs matrix",
          "DFS (recursive & iterative)",
          "BFS",
          "Topological sort (Kahn's + DFS)",
          "Cycle detection (directed vs undirected)",
          "Dijkstra's algorithm",
          "Bellman-Ford",
          "Floyd-Warshall",
          "Minimum Spanning Tree: Prim's, Kruskal's",
          "Union-Find (Disjoint Set Union)",
          "Bipartite check",
          "Strongly connected components (Tarjan, Kosaraju)",
        ],
      },
      {
        id: "backtracking",
        title: "Backtracking",
        subtopics: [
          "Backtracking template",
          "Subsets, permutations, combinations",
          "N-Queens",
          "Sudoku solver",
          "Word search",
          "Pruning strategies",
        ],
      },
      {
        id: "dp",
        title: "Dynamic Programming",
        subtopics: [
          "Memoization vs Tabulation",
          "1D DP: Fibonacci, climbing stairs, house robber",
          "2D DP: Grid paths, edit distance, LCS",
          "Knapsack variants (0/1, unbounded, fractional)",
          "Interval DP",
          "State machine DP",
          "Bitmasking DP",
          "DP on trees",
          "DP on graphs",
        ],
      },
      {
        id: "algorithms",
        title: "Core Algorithms",
        subtopics: [
          "Divide & conquer paradigm",
          "Greedy paradigm + correctness proofs",
          "Bit manipulation tricks",
          "Number theory (GCD, LCM, Sieve of Eratosthenes, modular arithmetic)",
          "Fast exponentiation",
          "Randomized algorithms (QuickSelect)",
          "Time & space complexity analysis",
          "Amortized analysis",
        ],
      },
    ],
  },
  {
    id: "spring",
    section: "Spring Ecosystem",
    icon: "🌱",
    color: "#22c55e",
    topics: [
      {
        id: "spring-core",
        title: "Spring Core & Boot",
        subtopics: [
          "IoC container — why inversion of control",
          "Dependency Injection types (constructor, setter, field)",
          "ApplicationContext lifecycle",
          "Bean lifecycle (@PostConstruct, @PreDestroy, InitializingBean)",
          "Bean scopes (singleton, prototype, request, session)",
          "Component scanning, @Configuration, @Bean",
          "Conditional beans (@ConditionalOnProperty, @Profile)",
          "Spring Boot auto-configuration internals",
          "spring.factories / AutoConfiguration imports",
          "SpringApplication startup sequence",
          "Externalized configuration (application.yml, @ConfigurationProperties)",
          "Actuator endpoints",
          "Spring Boot DevTools",
        ],
      },
      {
        id: "spring-aop",
        title: "Spring AOP",
        subtopics: [
          "Cross-cutting concerns problem",
          "Aspect, Advice, Pointcut, Join Point, Weaving",
          "Types of advice (@Before, @After, @Around, @AfterReturning, @AfterThrowing)",
          "Pointcut expressions",
          "JDK dynamic proxy vs CGLIB proxy",
          "AOP limitations (self-invocation problem)",
          "Practical uses: logging, transactions, security, caching",
        ],
      },
      {
        id: "spring-mvc",
        title: "Spring MVC",
        subtopics: [
          "DispatcherServlet — front controller pattern",
          "Request processing pipeline",
          "@Controller vs @RestController",
          "@RequestMapping, @GetMapping, @PostMapping",
          "@PathVariable, @RequestParam, @RequestBody, @ResponseBody",
          "HandlerInterceptor",
          "Exception handling: @ExceptionHandler, @ControllerAdvice",
          "Content negotiation",
          "Validation: @Valid, BindingResult, Custom validators",
          "MessageConverters (Jackson, XML)",
          "Async MVC (DeferredResult, Callable)",
        ],
      },
      {
        id: "spring-data",
        title: "Spring Data",
        subtopics: [
          "Repository pattern: CrudRepository, JpaRepository, PagingAndSortingRepository",
          "Query derivation from method names",
          "@Query (JPQL & native)",
          "JPA: Entity, @Id, @GeneratedValue, @Column",
          "Relationships: @OneToOne, @OneToMany, @ManyToMany",
          "Lazy vs Eager loading + N+1 problem",
          "Entity lifecycle (transient, managed, detached, removed)",
          "Transactions: @Transactional, propagation levels, isolation levels",
          "Optimistic vs Pessimistic locking",
          "Projections (interface, class, dynamic)",
          "Specifications (dynamic queries)",
          "Spring Data MongoDB",
          "Spring Data Redis",
          "Auditing (@CreatedDate, @LastModifiedDate)",
        ],
      },
      {
        id: "spring-security",
        title: "Spring Security",
        subtopics: [
          "Authentication vs Authorization",
          "Security filter chain",
          "SecurityContext & SecurityContextHolder",
          "UserDetailsService, UserDetails, PasswordEncoder",
          "Form login, HTTP Basic, OAuth2",
          "JWT — stateless auth flow",
          "OAuth2 Resource Server",
          "Method security (@PreAuthorize, @PostAuthorize)",
          "CSRF protection",
          "CORS configuration",
          "Role vs Authority",
          "Custom AuthenticationProvider",
          "Session management",
        ],
      },
      {
        id: "spring-webflux",
        title: "Spring WebFlux",
        subtopics: [
          "Reactive programming paradigm — why reactive",
          "Reactor: Mono, Flux",
          "Backpressure",
          "Schedulers",
          "Functional endpoints (RouterFunction, HandlerFunction)",
          "WebClient (non-blocking HTTP client)",
          "R2DBC (reactive relational DB)",
          "Error handling in reactive streams",
          "WebFlux vs MVC tradeoffs",
          "Server-Sent Events, WebSocket with WebFlux",
        ],
      },
      {
        id: "spring-cloud",
        title: "Spring Cloud",
        subtopics: [
          "Service discovery: Eureka, Consul",
          "Client-side load balancing: Spring Cloud LoadBalancer",
          "API Gateway: Spring Cloud Gateway",
          "Config Server (centralized configuration)",
          "Circuit breaker: Resilience4j integration",
          "Distributed tracing: Sleuth + Zipkin / Micrometer Tracing",
          "Spring Cloud OpenFeign (declarative HTTP client)",
          "Spring Cloud Contract (consumer-driven contracts)",
        ],
      },
      {
        id: "spring-testing",
        title: "Spring MVC Testing",
        subtopics: [
          "Unit vs Integration vs End-to-End tests",
          "MockMvc setup (standaloneSetup vs webAppContextSetup)",
          "perform(), andExpect(), andDo()",
          "@WebMvcTest slice",
          "@SpringBootTest + TestRestTemplate",
          "MockBean vs SpyBean",
          "@DataJpaTest slice",
          "Testcontainers for real DB",
          "WireMock for external HTTP",
          "Testing Security",
        ],
      },
      {
        id: "spring-ai",
        title: "Spring AI",
        subtopics: [
          "ChatClient, ChatModel abstraction",
          "Prompt templates",
          "Output parsers (BeanOutputParser, structured output)",
          "Embedding models",
          "Vector stores (pgvector, Redis, Chroma)",
          "RAG (Retrieval Augmented Generation) pattern",
          "Tool/Function calling",
          "Advisors (conversation memory, logging)",
          "Multi-modality (image input)",
          "Observability with Micrometer",
        ],
      },
    ],
  },
  {
    id: "backend-arch",
    section: "Backend & Architecture",
    icon: "🏗️",
    color: "#06b6d4",
    topics: [
      {
        id: "rest-api",
        title: "REST API Design",
        subtopics: [
          "REST constraints (stateless, uniform interface, layered, cacheable)",
          "Resource naming conventions",
          "HTTP methods semantics (GET, POST, PUT, PATCH, DELETE)",
          "HTTP status codes — when to use each",
          "HATEOAS",
          "Versioning strategies (URL, header, media type)",
          "Pagination (offset vs cursor-based)",
          "Filtering, sorting, searching patterns",
          "Rate limiting",
          "API documentation with OpenAPI / Swagger",
          "Idempotency keys",
        ],
      },
      {
        id: "graphql",
        title: "GraphQL",
        subtopics: [
          "GraphQL vs REST tradeoffs",
          "Schema definition (types, queries, mutations, subscriptions)",
          "Resolvers",
          "N+1 problem in GraphQL + DataLoader solution",
          "Spring for GraphQL",
          "Authentication in GraphQL",
          "Pagination in GraphQL (cursor-based)",
          "Schema stitching vs federation",
          "Persisted queries",
        ],
      },
      {
        id: "microservices",
        title: "Microservices",
        subtopics: [
          "Monolith vs Microservices tradeoffs",
          "Domain-Driven Design (Bounded contexts, Aggregates)",
          "Service decomposition strategies",
          "Inter-service communication: sync vs async",
          "API Gateway pattern",
          "Service discovery",
          "Circuit breaker pattern",
          "Saga pattern (choreography vs orchestration)",
          "CQRS (Command Query Responsibility Segregation)",
          "Event sourcing",
          "Distributed transactions",
          "Data consistency patterns",
          "Strangler fig migration pattern",
          "12-factor app methodology",
        ],
      },
      {
        id: "kafka",
        title: "Kafka",
        subtopics: [
          "Kafka architecture (brokers, topics, partitions, offsets)",
          "Producers: acknowledgment modes (acks=0, 1, all)",
          "Consumers: consumer groups, partition assignment",
          "Consumer lag",
          "At-most-once, at-least-once, exactly-once semantics",
          "Idempotent producer",
          "Kafka transactions",
          "Kafka Streams",
          "Kafka Connect",
          "Schema Registry & Avro",
          "Compacted topics",
          "Retention policies",
          "Replication factor & ISR",
          "Kafka vs RabbitMQ tradeoffs",
        ],
      },
      {
        id: "rabbitmq",
        title: "RabbitMQ & Message Brokers",
        subtopics: [
          "AMQP model: exchanges, queues, bindings",
          "Exchange types: direct, fanout, topic, headers",
          "Message acknowledgment modes",
          "Dead letter exchanges (DLX)",
          "Message TTL & queue TTL",
          "Publisher confirms",
          "Persistent messages",
          "Prefetch count & QoS",
          "RabbitMQ clustering",
          "RabbitMQ vs Kafka use cases",
          "Message broker patterns: work queues, pub/sub, routing, RPC",
        ],
      },
      {
        id: "hld",
        title: "HLD — High Level Design",
        subtopics: [
          "Estimation: RPS, storage, bandwidth calculations",
          "Load balancing algorithms (round-robin, least connections, IP hash, weighted)",
          "Caching strategies (cache-aside, write-through, write-behind, read-through)",
          "CDN — push vs pull",
          "Database sharding strategies (horizontal, vertical, range, hash, directory)",
          "Replication (master-slave, multi-master)",
          "CAP theorem",
          "PACELC theorem",
          "Consistent hashing",
          "Rate limiting algorithms (token bucket, leaky bucket, sliding window)",
          "Designing: URL shortener, Twitter feed, Chat app, Uber, YouTube",
        ],
      },
      {
        id: "lld",
        title: "LLD — Low Level Design",
        subtopics: [
          "SOLID principles",
          "Design patterns: Creational (Singleton, Factory, Builder, Prototype, Abstract Factory)",
          "Design patterns: Structural (Adapter, Bridge, Composite, Decorator, Facade, Proxy, Flyweight)",
          "Design patterns: Behavioral (Observer, Strategy, Command, Iterator, Mediator, State, Template Method, Chain of Responsibility)",
          "Designing: Parking lot, Library management, Chess, Elevator, Movie booking",
          "UML: Class diagrams, Sequence diagrams",
        ],
      },
    ],
  },
  {
    id: "databases",
    section: "Databases",
    icon: "🗄️",
    color: "#f97316",
    topics: [
      {
        id: "sql-fundamentals",
        title: "SQL Fundamentals",
        subtopics: [
          "DDL, DML, DCL, TCL commands",
          "JOINs (INNER, LEFT, RIGHT, FULL, CROSS, SELF)",
          "Subqueries vs JOINs tradeoffs",
          "Window functions (ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, PARTITION BY)",
          "CTEs (WITH clause)",
          "Stored procedures, functions, triggers",
          "Views & materialized views",
          "Indexes: B-tree, Hash, Bitmap, Composite, Partial, Covering",
          "EXPLAIN / EXPLAIN ANALYZE",
          "Query optimization techniques",
          "ACID properties",
          "Isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE)",
          "Dirty read, non-repeatable read, phantom read",
        ],
      },
      {
        id: "postgresql",
        title: "PostgreSQL",
        subtopics: [
          "PostgreSQL architecture (postmaster, backends, WAL)",
          "MVCC (Multi-Version Concurrency Control)",
          "WAL (Write-Ahead Logging)",
          "Vacuum & autovacuum",
          "Table partitioning",
          "JSONB vs JSON",
          "Full-text search",
          "Logical replication",
          "PostgreSQL-specific data types (arrays, hstore, uuid, inet)",
          "pg_stat_* views for monitoring",
          "Connection pooling with PgBouncer",
        ],
      },
      {
        id: "mysql-mssql",
        title: "MySQL & MSSQL",
        subtopics: [
          "MySQL: InnoDB vs MyISAM storage engines",
          "MySQL: binary log (binlog) for replication",
          "MySQL: row vs statement vs mixed binlog format",
          "MySQL: Group Replication vs InnoDB Cluster",
          "MSSQL: Always On Availability Groups",
          "MSSQL: Clustered vs non-clustered indexes",
          "MSSQL: columnstore indexes",
          "MSSQL: Query Store",
          "MSSQL: Execution plan caching",
          "MySQL vs PostgreSQL vs MSSQL tradeoffs",
        ],
      },
      {
        id: "mongodb",
        title: "MongoDB",
        subtopics: [
          "Document model vs relational model tradeoffs",
          "BSON types",
          "Collections, documents, embedded documents",
          "Indexing: single field, compound, multikey, text, geospatial",
          "Aggregation pipeline ($match, $group, $project, $lookup, $unwind)",
          "Schema design: embedding vs referencing",
          "Transactions (multi-document)",
          "Read concerns & write concerns",
          "Replica sets",
          "Sharding (range-based, hash-based, zone sharding)",
          "Change streams",
          "Atlas Search",
        ],
      },
    ],
  },
  {
    id: "cloud-devops",
    section: "Cloud & DevOps",
    icon: "☁️",
    color: "#3b82f6",
    topics: [
      {
        id: "aws",
        title: "AWS",
        subtopics: [
          "IAM (users, roles, policies, trust relationships)",
          "VPC (subnets, route tables, security groups, NACLs, peering, Transit Gateway)",
          "EC2 (instance types, AMIs, auto-scaling groups, launch templates)",
          "S3 (storage classes, lifecycle policies, versioning, replication, presigned URLs)",
          "RDS (Multi-AZ, read replicas, parameter groups)",
          "ElastiCache (Redis vs Memcached on AWS)",
          "EKS, ECS, Fargate",
          "Lambda (cold start, concurrency, layers, event sources)",
          "SQS, SNS, EventBridge",
          "MSK (Managed Kafka)",
          "CloudWatch, CloudTrail, X-Ray",
          "API Gateway",
          "Route 53",
          "CloudFront",
          "Secrets Manager vs Parameter Store",
        ],
      },
      {
        id: "azure",
        title: "Azure",
        subtopics: [
          "Azure AD (Entra ID) — authentication & RBAC",
          "Azure Virtual Network, NSG, peering",
          "Azure VMs, Scale Sets, Availability Zones",
          "Azure Blob Storage, Data Lake",
          "Azure SQL, Cosmos DB",
          "Azure Kubernetes Service (AKS)",
          "Azure Functions (serverless)",
          "Azure Service Bus, Event Hub, Event Grid",
          "Azure Monitor, Application Insights",
          "Azure DevOps Pipelines",
          "Azure Key Vault",
        ],
      },
      {
        id: "gcp",
        title: "GCP",
        subtopics: [
          "GCP IAM & service accounts",
          "GCE, GKE",
          "Cloud Storage",
          "Cloud SQL, Spanner, Bigtable, Firestore",
          "Pub/Sub",
          "Cloud Functions, Cloud Run",
          "BigQuery",
          "Cloud Monitoring, Cloud Logging",
          "Anthos (multi-cloud Kubernetes)",
        ],
      },
      {
        id: "kubernetes",
        title: "Kubernetes",
        subtopics: [
          "Control plane: API Server, etcd, Scheduler, Controller Manager",
          "Worker node: kubelet, kube-proxy, container runtime",
          "Pod lifecycle",
          "Deployments, ReplicaSets, StatefulSets, DaemonSets",
          "Services (ClusterIP, NodePort, LoadBalancer, ExternalName)",
          "Ingress & Ingress controllers (Nginx, Traefik)",
          "ConfigMaps & Secrets",
          "PersistentVolumes, PersistentVolumeClaims, StorageClasses",
          "Resource requests & limits (CPU, memory)",
          "Horizontal Pod Autoscaler, Vertical Pod Autoscaler, KEDA",
          "Namespaces & RBAC",
          "Network policies",
          "Helm charts",
          "Health checks: liveness, readiness, startup probes",
          "Rolling updates, canary deployments, blue-green deployments",
          "Service mesh: Istio (concept)",
        ],
      },
      {
        id: "podman",
        title: "Podman & Containers",
        subtopics: [
          "Containers vs VMs",
          "OCI image spec",
          "Dockerfile best practices (layer caching, multi-stage builds, distroless)",
          "Podman vs Docker differences (daemon-less, rootless)",
          "Podman pods",
          "Buildah for image building",
          "Skopeo for image inspection",
          "Container networking (bridge, host, none, overlay)",
          "Container security (seccomp, AppArmor, capabilities)",
          "Image scanning (Trivy, Grype)",
        ],
      },
    ],
  },
  {
    id: "production",
    section: "Production Engineering",
    icon: "🔥",
    color: "#dc2626",
    topics: [
      {
        id: "distributed-systems",
        title: "Distributed Systems",
        subtopics: [
          "Fallacies of distributed computing",
          "Network partitions & handling",
          "Clock synchronization (physical vs logical vs vector clocks)",
          "Consensus algorithms (Raft, Paxos concepts)",
          "Leader election",
          "Distributed locking (Redis Redlock, ZooKeeper)",
          "Distributed caching strategies",
          "Eventual consistency patterns",
          "Two-phase commit (2PC) & its failure modes",
          "Idempotency in distributed systems",
          "Outbox pattern for reliable event publishing",
          "Saga orchestration vs choreography",
        ],
      },
      {
        id: "observability",
        title: "Observability",
        subtopics: [
          "The three pillars: Logs, Metrics, Traces",
          "Structured logging (JSON logs, MDC in Java)",
          "Log levels strategy (when to use DEBUG vs INFO vs WARN vs ERROR)",
          "Metrics: counters, gauges, histograms, summaries",
          "Micrometer + Prometheus + Grafana",
          "Distributed tracing: OpenTelemetry",
          "Jaeger / Zipkin setup",
          "SLI, SLO, SLA definitions",
          "Error budgets",
          "Alerting strategies (avoid alert fatigue)",
          "Correlation IDs in logs",
          "Centralized logging: ELK Stack / Loki",
        ],
      },
      {
        id: "production-errors",
        title: "Production Errors & Debugging",
        subtopics: [
          "OutOfMemoryError — heap vs metaspace vs native",
          "StackOverflowError",
          "Deadlock detection from thread dumps",
          "High CPU — identifying hot threads",
          "High memory — heap dump analysis",
          "Slow queries — identifying & fixing",
          "Connection pool exhaustion",
          "Cascading failures & bulkhead pattern",
          "Circuit breaker states & tuning",
          "GC pauses causing latency spikes",
          "ClassNotFoundException vs NoClassDefFoundError",
          "NoSuchMethodError — classpath conflicts",
          "ConcurrentModificationException",
          "TimeoutException in distributed calls",
          "Incident response process (detection, triage, mitigation, RCA)",
        ],
      },
    ],
  },
];

const STATUS_CYCLE = ["not-started", "in-progress", "done", "needs-revision"];
const STATUS_CONFIG = {
  "not-started": { label: "Not Started", color: "#374151", bg: "#1f2937", icon: "○" },
  "in-progress": { label: "In Progress", color: "#f59e0b", bg: "#451a03", icon: "◑" },
  "done": { label: "Done", color: "#10b981", bg: "#052e16", icon: "●" },
  "needs-revision": { label: "Needs Revision", color: "#8b5cf6", bg: "#2e1065", icon: "↺" },
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function useStorage() {
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (window.storage && typeof window.storage.get === 'function') {
          const result = await window.storage.get("tracker-data");
          if (result) setData(JSON.parse(result.value));
        } else {
          const result = localStorage.getItem("tracker-data");
          if (result) setData(JSON.parse(result));
        }
      } catch (err) {
        console.error("Failed to load tracker storage:", err);
      }
      setLoaded(true);
    }
    load();
  }, []);

  const save = useCallback(async (newData) => {
    setData(newData);
    try {
      if (window.storage && typeof window.storage.set === 'function') {
        await window.storage.set("tracker-data", JSON.stringify(newData));
      } else {
        localStorage.setItem("tracker-data", JSON.stringify(newData));
      }
    } catch (err) {
      console.error("Failed to save tracker storage:", err);
    }
  }, []);

  return { data, save, loaded };
}

export default function Tracker() {
  const { data, save, loaded } = useStorage();
  const [activeSection, setActiveSection] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [timerTopicId, setTimerTopicId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [view, setView] = useState("roadmap"); // roadmap | section
  const intervalRef = useRef(null);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  const getStatus = (id) => data[`status_${id}`] || "not-started";
  const getTime = (id) => data[`time_${id}`] || 0;

  const cycleStatus = (id) => {
    const cur = getStatus(id);
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
    save({ ...data, [`status_${id}`]: next });
  };

  const startTimer = (id) => {
    if (timerRunning && timerTopicId === id) {
      // stop & save
      const newData = { ...data, [`time_${id}`]: getTime(id) + timerSeconds };
      save(newData);
      setTimerRunning(false);
      setTimerSeconds(0);
      setTimerTopicId(null);
    } else {
      if (timerRunning && timerTopicId) {
        const newData = { ...data, [`time_${timerTopicId}`]: getTime(timerTopicId) + timerSeconds };
        save(newData);
      }
      setTimerSeconds(0);
      setTimerTopicId(id);
      setTimerRunning(true);
    }
  };

  const getSectionProgress = (section) => {
    const all = [];
    section.topics.forEach(t => {
      all.push(t.id);
      t.subtopics.forEach((_, i) => all.push(`${t.id}_sub_${i}`));
    });
    const done = all.filter(id => getStatus(id) === "done").length;
    return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
  };

  const getSectionTime = (section) => {
    let total = 0;
    section.topics.forEach(t => {
      total += getTime(t.id);
      t.subtopics.forEach((_, i) => { total += getTime(`${t.id}_sub_${i}`); });
    });
    return total;
  };

  if (!loaded) {
    return (
      <div style={{ background: "var(--bg-primary)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: "monospace" }}>
        Loading tracker...
      </div>
    );
  }

  const currentSection = activeSection ? CURRICULUM.find(s => s.id === activeSection) : null;

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 14 }}>
      {/* Header */}
      <div style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        {view === "section" && (
          <button onClick={() => { setView("roadmap"); setActiveSection(null); setExpandedTopic(null); }}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px 8px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
            {view === "section" && currentSection ? `${currentSection.icon} ${currentSection.section}` : "☕ Java Mastery Tracker"}
          </div>
          {view === "roadmap" && (
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
              {CURRICULUM.reduce((a, s) => a + getSectionProgress(s).done, 0)} /{" "}
              {CURRICULUM.reduce((a, s) => a + getSectionProgress(s).total, 0)} items done
            </div>
          )}
        </div>
        {timerRunning && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#f59e0b", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-color)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
            {formatTime(timerSeconds)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--bg-primary); } ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }
        .topic-row:hover { background: rgba(255,255,255,0.015) !important; }
        .sub-row:hover { background: rgba(255,255,255,0.01) !important; }
        .section-card:hover { border-color: var(--accent-gold) !important; transform: translateY(-1px); }
        .btn-status:hover { filter: brightness(1.2); }
      `}</style>

      {view === "roadmap" && (
        <div style={{ padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            WHY → WHAT → HOW &nbsp;·&nbsp; Feel the pain first &nbsp;·&nbsp; Build intuition, not memory
          </div>

          {/* Overall progress */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)" }}>Overall Progress</span>
              <span style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>
                {Math.round(CURRICULUM.reduce((a, s) => a + getSectionProgress(s).pct, 0) / CURRICULUM.length)}%
              </span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                background: "linear-gradient(90deg, #10b981, var(--color-primary, #3b82f6))",
                width: `${Math.round(CURRICULUM.reduce((a, s) => a + getSectionProgress(s).pct, 0) / CURRICULUM.length)}%`,
                transition: "width 0.5s"
              }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                  <span style={{ color: v.color }}>{v.icon}</span> {v.label}
                </div>
              ))}
            </div>
          </div>

          {/* Section cards */}
          <div style={{ display: "grid", gap: 14 }}>
            {CURRICULUM.map((section, idx) => {
              const prog = getSectionProgress(section);
              const stime = getSectionTime(section);
              return (
                <div key={section.id} className="section-card"
                  onClick={() => { setActiveSection(section.id); setView("section"); }}
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ fontSize: 24, lineHeight: 1 }}>{section.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace", marginRight: 8 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>{section.section}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                          {stime > 0 && <span style={{ fontFamily: "monospace" }}>⏱ {formatTime(stime)}</span>}
                          <span style={{ color: section.color, fontWeight: 600 }}>{prog.pct}%</span>
                          <span>{prog.done}/{prog.total}</span>
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 3, height: 4, marginTop: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: section.color, width: `${prog.pct}%`, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {section.topics.slice(0, 5).map(t => (
                          <span key={t.id} style={{ fontSize: 11, color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: 10 }}>
                            {t.title}
                          </span>
                        ))}
                        {section.topics.length > 5 && (
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", padding: "2px 8px" }}>+{section.topics.length - 5} more</span>
                        )}
                      </div>
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 18, marginLeft: 4 }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "section" && currentSection && (
        <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
          {/* Section progress bar */}
          {(() => {
            const prog = getSectionProgress(currentSection);
            const stime = getSectionTime(currentSection);
            return (
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                    <span>{prog.done} of {prog.total} done</span>
                    <span style={{ color: currentSection.color, fontWeight: 600 }}>{prog.pct}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 3, height: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: currentSection.color, width: `${prog.pct}%`, transition: "width 0.3s" }} />
                  </div>
                </div>
                {stime > 0 && <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-secondary)" }}>⏱ {formatTime(stime)} total</span>}
              </div>
            );
          })()}

          {/* Topics */}
          <div style={{ display: "grid", gap: 10 }}>
            {currentSection.topics.map((topic) => {
              const isExpanded = expandedTopic === topic.id;
              const status = getStatus(topic.id);
              const sc = STATUS_CONFIG[status];
              const ttime = getTime(topic.id);
              const isActiveTimer = timerTopicId === topic.id && timerRunning;

              return (
                <div key={topic.id} style={{ background: "var(--bg-secondary)", border: `1px solid ${isExpanded ? "var(--border-color)" : "transparent"}`, borderRadius: 10, overflow: "hidden" }}>
                  {/* Topic header row */}
                  <div className="topic-row"
                    style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 12, cursor: "pointer", background: "var(--bg-secondary)" }}
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}>

                    {/* Status button */}
                    <button className="btn-status"
                      onClick={e => { e.stopPropagation(); cycleStatus(topic.id); }}
                      style={{
                        background: sc.bg,
                        border: `1px solid ${sc.color}`,
                        color: sc.color,
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                      <span>{sc.icon}</span>
                      <span>{sc.label}</span>
                    </button>

                    {/* Topic Title */}
                    <div style={{ flex: 1, fontWeight: 600 }}>{topic.title}</div>

                    {/* Timer controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                      {ttime > 0 && (
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                          {formatTime(ttime)}
                        </span>
                      )}
                      <button 
                        onClick={() => startTimer(topic.id)}
                        style={{
                          background: isActiveTimer ? "#451a03" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${isActiveTimer ? "#f59e0b" : "var(--border-color)"}`,
                          color: isActiveTimer ? "#f59e0b" : "var(--text-secondary)",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "monospace"
                        }}
                      >
                        {isActiveTimer ? "⏹ Stop" : "⏱ Start"}
                      </button>
                    </div>

                    <div style={{ color: "var(--text-secondary)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
                      ›
                    </div>
                  </div>

                  {/* Subtopics list */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.15)", padding: "8px 16px" }}>
                      {topic.subtopics.map((subtopic, subIdx) => {
                        const subId = `${topic.id}_sub_${subIdx}`;
                        const subStatus = getStatus(subId);
                        const subConfig = STATUS_CONFIG[subStatus];
                        const subTime = getTime(subId);
                        const isSubActiveTimer = timerTopicId === subId && timerRunning;

                        return (
                          <div key={subIdx} className="sub-row"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "8px 0",
                              gap: 12,
                              borderBottom: subIdx < topic.subtopics.length - 1 ? "1px solid var(--border-color)" : "none"
                            }}>
                            {/* Subtopic Status checkbox */}
                            <button className="btn-status"
                              onClick={() => cycleStatus(subId)}
                              style={{
                                background: "none",
                                border: "none",
                                color: subConfig.color,
                                cursor: "pointer",
                                fontSize: 14,
                                padding: 0
                              }}>
                                {subConfig.icon}
                            </button>

                            {/* Subtopic Title */}
                            <div style={{ flex: 1, color: subStatus === "done" ? "var(--text-secondary)" : "var(--text-primary)", textDecoration: subStatus === "done" ? "line-through" : "none", fontSize: 13 }}>
                              {subtopic}
                            </div>

                            {/* Subtopic Timer controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {subTime > 0 && (
                                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                                  {formatTime(subTime)}
                                </span>
                              )}
                              <button 
                                onClick={() => startTimer(subId)}
                                style={{
                                  background: isSubActiveTimer ? "#451a03" : "rgba(0,0,0,0.2)",
                                  border: `1px solid ${isSubActiveTimer ? "#f59e0b" : "var(--border-color)"}`,
                                  color: isSubActiveTimer ? "#f59e0b" : "var(--text-secondary)",
                                  borderRadius: 4,
                                  padding: "2px 6px",
                                  fontSize: 11,
                                  cursor: "pointer",
                                  fontFamily: "monospace"
                                }}
                              >
                                {isSubActiveTimer ? "⏹ Stop" : "⏱ Start"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
