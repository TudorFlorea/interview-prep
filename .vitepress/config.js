export default {
  base: '/interview-prep/',
  title: 'Interview Prep',
  description: 'Technical interview preparation notes',
  themeConfig: {
    nav: [
      { text: 'DSA', link: '/dsa/00-index' },
      { text: 'System Design', link: '/system-design/00-index' },
      { text: 'Databases', link: '/databases/00-index' },
      { text: 'Design Patterns', link: '/design-patterns/00-index' },
      { text: 'Networking', link: '/networking/00-index' },
      { text: 'Behavioral', link: '/behavioral/00-index' },
      { text: 'System Design', link: '/system-design/00-index' }
    ],
    sidebar: {
      '/system-design/': [
        {
          text: 'System Design',
          collapsed: false,
          items: [
            { text: 'Index', link: '/system-design/00-index' },
            {
              text: 'Fundamentals',
              collapsed: false,
              items: [
                { text: 'Index', link: '/system-design/fundamentals/00-index' },
                { text: 'Introduction & Framework', link: '/system-design/fundamentals/01-introduction-and-framework' },
                { text: 'Requirements Gathering', link: '/system-design/fundamentals/02-requirements-gathering' },
                { text: 'Back of Envelope Calculations', link: '/system-design/fundamentals/03-back-of-envelope-calculations' },
                { text: 'API Design', link: '/system-design/fundamentals/04-api-design' },
                { text: 'Data Modeling', link: '/system-design/fundamentals/05-data-modeling' },
                { text: 'Databases', link: '/system-design/fundamentals/06-databases' },
                { text: 'Caching', link: '/system-design/fundamentals/07-caching' },
                { text: 'Load Balancing', link: '/system-design/fundamentals/08-load-balancing' },
                { text: 'Message Queues', link: '/system-design/fundamentals/09-message-queues' },
                { text: 'Scaling Strategies', link: '/system-design/fundamentals/10-scaling-strategies' },
                { text: 'Database Scaling', link: '/system-design/fundamentals/11-database-scaling' },
                { text: 'Consistent Hashing', link: '/system-design/fundamentals/12-consistent-hashing' },
                { text: 'CAP Theorem', link: '/system-design/fundamentals/13-cap-theorem' },
                { text: 'Distributed Patterns', link: '/system-design/fundamentals/14-distributed-patterns' },
                { text: 'Real-Time Communication', link: '/system-design/fundamentals/15-real-time-communication' },
                { text: 'Search & Indexing', link: '/system-design/fundamentals/16-search-and-indexing' },
                { text: 'Blob Storage & CDN', link: '/system-design/fundamentals/17-blob-storage-and-cdn' },
                { text: 'Rate Limiting', link: '/system-design/fundamentals/18-rate-limiting' },
                { text: 'Monitoring & Observability', link: '/system-design/fundamentals/19-monitoring-and-observability' },
                { text: 'Fault Tolerance', link: '/system-design/fundamentals/20-fault-tolerance' },
                { text: 'Security', link: '/system-design/fundamentals/21-security' }
              ]
            },
            {
              text: 'Problems',
              collapsed: false,
              items: [
                { text: 'Index', link: '/system-design/problems/00-index' },
                { text: '01. URL Shortener', link: '/system-design/problems/01-url-shortener' },
                { text: '02. Rate Limiter', link: '/system-design/problems/02-rate-limiter' },
                { text: '03. Twitter Feed', link: '/system-design/problems/03-twitter-feed' },
                { text: '04. Instagram', link: '/system-design/problems/04-instagram' },
                { text: '05. YouTube', link: '/system-design/problems/05-youtube' },
                { text: '06. Uber', link: '/system-design/problems/06-uber' },
                { text: '07. WhatsApp', link: '/system-design/problems/07-whatsapp' },
                { text: '08. Dropbox', link: '/system-design/problems/08-dropbox' },
                { text: '09. Notification System', link: '/system-design/problems/09-notification-system' },
                { text: '10. Web Crawler', link: '/system-design/problems/10-web-crawler' },
                { text: '11. Ticketmaster', link: '/system-design/problems/11-ticketmaster' },
                { text: '12. Google Docs', link: '/system-design/problems/12-google-docs' },
                { text: '13. Search Autocomplete', link: '/system-design/problems/13-search-autocomplete' },
                { text: '14. Distributed Cache', link: '/system-design/problems/14-distributed-cache' },
                { text: '15. Job Scheduler', link: '/system-design/problems/15-job-scheduler' },
                { text: '16. Payment System', link: '/system-design/problems/16-payment-system' },
                { text: '17. Metrics System', link: '/system-design/problems/17-metrics-system' },
                { text: '18. Ad Click Aggregator', link: '/system-design/problems/18-ad-click-aggregator' },
                { text: '19. Key-Value Store', link: '/system-design/problems/19-key-value-store' },
                { text: '20. News Feed Ranking', link: '/system-design/problems/20-news-feed-ranking' },
                { text: '21. Amazon Locker', link: '/system-design/problems/21-amazon-locker' }
              ]
            }
          ]
        }
      ],
      '/dsa/': [
        {
          text: 'DSA',
          collapsed: false,
          items: [
            { text: 'Index', link: '/dsa/00-index' },
            { text: 'Arrays and Hashing', link: '/dsa/01-arrays-and-hashing' },
            { text: 'Two Pointers', link: '/dsa/02-two-pointers' },
            { text: 'Sliding Window', link: '/dsa/03-sliding-window' },
            { text: 'Stack', link: '/dsa/04-stack' },
            { text: 'Binary Search', link: '/dsa/05-binary-search' },
            { text: 'Linked List', link: '/dsa/06-linked-list' },
            { text: 'Trees', link: '/dsa/07-trees' },
            { text: 'Tries', link: '/dsa/08-tries' },
            { text: 'Heap / Priority Queue', link: '/dsa/09-heap-priority-queue' },
            { text: 'Backtracking', link: '/dsa/10-backtracking' },
            { text: 'Graphs', link: '/dsa/11-graphs' },
            { text: 'Advanced Graphs', link: '/dsa/12-advanced-graphs' },
            { text: '1D Dynamic Programming', link: '/dsa/13-1d-dynamic-programming' },
            { text: '2D Dynamic Programming', link: '/dsa/14-2d-dynamic-programming' },
            { text: 'Greedy', link: '/dsa/15-greedy' },
            { text: 'Intervals', link: '/dsa/16-intervals' },
            { text: 'Math and Geometry', link: '/dsa/17-math-and-geometry' },
            { text: 'Bit Manipulation', link: '/dsa/18-bit-manipulation' }
          ]
        }
      ],
      '/databases/': [
        {
          text: 'Databases',
          collapsed: false,
          items: [
            { text: 'Index', link: '/databases/00-index' },
            { text: 'Database Design Principles', link: '/databases/01-database-design-principles' },
            { text: 'Normalization', link: '/databases/02-normalization' },
            { text: 'Keys and Constraints', link: '/databases/03-keys-and-constraints' },
            { text: 'Multi-Table Queries', link: '/databases/04-multi-table-queries' },
            { text: 'Subqueries and CTEs', link: '/databases/05-subqueries-and-ctes' },
            { text: 'Advanced SQL Patterns', link: '/databases/06-advanced-sql-patterns' },
            { text: 'Indexing Deep Dive', link: '/databases/07-indexing-deep-dive' },
            { text: 'Query Execution Internals', link: '/databases/08-query-execution-internals' },
            { text: 'Query Optimization', link: '/databases/09-query-optimization' },
            { text: 'Performance Tuning', link: '/databases/10-performance-tuning' },
            { text: 'Transactions and ACID', link: '/databases/11-transactions-and-acid' },
            { text: 'Locking and Concurrency', link: '/databases/12-locking-and-concurrency' },
            { text: 'Partitioning and Sharding', link: '/databases/13-partitioning-and-sharding' },
            { text: 'Replication and Consistency', link: '/databases/14-replication-and-consistency' },
            { text: 'Database Internals', link: '/databases/15-database-internals' },
            { text: 'JSON and Document Storage', link: '/databases/16-json-and-document-storage' },
            { text: 'Full Text Search', link: '/databases/17-full-text-search' },
            { text: 'Stored Procedures & Triggers', link: '/databases/18-stored-procedures-triggers' },
            { text: 'Security and Access Control', link: '/databases/19-security-and-access-control' },
            { text: 'Migrations and Versioning', link: '/databases/20-migrations-and-versioning' },
            { text: 'ORM vs Raw SQL', link: '/databases/21-orm-vs-raw-sql' }
          ]
        }
      ],
      '/design-patterns/': [
        {
          text: 'Design Patterns',
          collapsed: false,
          items: [
            { text: 'Index', link: '/design-patterns/00-index' },
            {
              text: 'Creational',
              collapsed: true,
              items: [
                { text: 'Index', link: '/design-patterns/creational/00-index' },
                { text: 'Factory Method', link: '/design-patterns/creational/01-factory-method' },
                { text: 'Abstract Factory', link: '/design-patterns/creational/02-abstract-factory' },
                { text: 'Builder', link: '/design-patterns/creational/03-builder' },
                { text: 'Prototype', link: '/design-patterns/creational/04-prototype' },
                { text: 'Singleton', link: '/design-patterns/creational/05-singleton' }
              ]
            },
            {
              text: 'Structural',
              collapsed: true,
              items: [
                { text: 'Index', link: '/design-patterns/structural/00-index' },
                { text: 'Adapter', link: '/design-patterns/structural/01-adapter' },
                { text: 'Bridge', link: '/design-patterns/structural/02-bridge' },
                { text: 'Composite', link: '/design-patterns/structural/03-composite' },
                { text: 'Decorator', link: '/design-patterns/structural/04-decorator' },
                { text: 'Facade', link: '/design-patterns/structural/05-facade' },
                { text: 'Flyweight', link: '/design-patterns/structural/06-flyweight' },
                { text: 'Proxy', link: '/design-patterns/structural/07-proxy' }
              ]
            },
            {
              text: 'Behavioral',
              collapsed: true,
              items: [
                { text: 'Index', link: '/design-patterns/behavioral/00-index' },
                { text: 'Chain of Responsibility', link: '/design-patterns/behavioral/01-chain-of-responsibility' },
                { text: 'Command', link: '/design-patterns/behavioral/02-command' },
                { text: 'Iterator', link: '/design-patterns/behavioral/03-iterator' },
                { text: 'Mediator', link: '/design-patterns/behavioral/04-mediator' },
                { text: 'Memento', link: '/design-patterns/behavioral/05-memento' },
                { text: 'Observer', link: '/design-patterns/behavioral/06-observer' },
                { text: 'State', link: '/design-patterns/behavioral/07-state' },
                { text: 'Strategy', link: '/design-patterns/behavioral/08-strategy' },
                { text: 'Template Method', link: '/design-patterns/behavioral/09-template-method' },
                { text: 'Visitor', link: '/design-patterns/behavioral/10-visitor' }
              ]
            }
          ]
        }
      ],
      '/networking/': [
        {
          text: 'Networking',
          collapsed: false,
          items: [
            { text: 'Index', link: '/networking/00-index' },
            { text: 'Internet and Protocols', link: '/networking/01-internet-and-protocols' },
            { text: 'HTTP and HTTPS', link: '/networking/02-http-and-https' },
            { text: 'DNS', link: '/networking/03-dns' },
            { text: 'TCP and UDP', link: '/networking/04-tcp-and-udp' },
            { text: 'TLS and Security', link: '/networking/05-tls-and-security' },
            { text: 'IP Addressing and Subnets', link: '/networking/06-ip-addressing-and-subnets' },
            { text: 'Routing Basics', link: '/networking/07-routing-basics' },
            { text: 'Load Balancing', link: '/networking/08-load-balancing' },
            { text: 'Proxies and Gateways', link: '/networking/09-proxies-and-gateways' },
            { text: 'Firewalls and Security Groups', link: '/networking/10-firewalls-and-security-groups' },
            { text: 'WebSockets and Real-Time', link: '/networking/11-websockets-and-real-time' },
            { text: 'Physical and Link Layer', link: '/networking/12-physical-and-link-layer' },
            { text: 'Debugging and Tools', link: '/networking/13-debugging-and-tools' }
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    darkModeSwitchLabel: 'Theme',
    outline: 'deep'
  }
}
