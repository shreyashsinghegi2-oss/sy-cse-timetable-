// Skill assessment question bank.
// Pools per skill × level. Server samples random subset per attempt.
// Add more questions to expand pool (>200 per skill recommended in production).

export interface MCQ {
  id: string;
  q: string;
  opts: [string, string, string, string];
  correct: number; // 0-3
  explain: string;
  topic?: string;
}

export interface Submission {
  id: string;
  prompt: string;
  placeholder?: string;
}

export interface LevelConfig {
  time_sec: number;
  pass_pct: number;
  credits: number;
  mcq_count: number;
  pool: MCQ[];
  submission_pool?: Submission[];
}

export interface SkillBank {
  name: string;
  aliases?: string[];
  levels: { 1: LevelConfig; 2: LevelConfig; 3: LevelConfig };
}

const dsa: SkillBank = {
  name: "Data Structures & Algorithms",
  aliases: ["dsa", "algorithms", "data structures"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "dsa_l1_1", q: "What is the time complexity of binary search on a sorted array of n elements?", opts: ["O(n)","O(log n)","O(n log n)","O(1)"], correct: 1, explain: "Binary search halves the search range each step → log₂(n)." },
      { id: "dsa_l1_2", q: "Which data structure follows Last-In-First-Out (LIFO) order?", opts: ["Queue","Stack","Linked List","Array"], correct: 1, explain: "Stacks push/pop from the same end (top), so the last pushed is first popped." },
      { id: "dsa_l1_3", q: "Which traversal of a binary search tree visits nodes in sorted ascending order?", opts: ["Pre-order","In-order","Post-order","Level-order"], correct: 1, explain: "In-order traversal of a BST visits left-root-right, yielding sorted order." },
      { id: "dsa_l1_4", q: "What is the worst-case time complexity of QuickSort?", opts: ["O(n)","O(n log n)","O(n²)","O(log n)"], correct: 2, explain: "Worst case occurs when pivot is always smallest/largest → n² comparisons." },
      { id: "dsa_l1_5", q: "Which of these is NOT a linear data structure?", opts: ["Array","Linked List","Stack","Tree"], correct: 3, explain: "Trees are hierarchical / non-linear — every other option is linear." },
      { id: "dsa_l1_6", q: "What is the space complexity of an iterative algorithm that uses only a fixed number of variables?", opts: ["O(1)","O(n)","O(log n)","O(n²)"], correct: 0, explain: "Constant extra memory regardless of input size." },
      { id: "dsa_l1_7", q: "Which traversal would you use to print all leaves of a tree from left to right?", opts: ["Pre-order","DFS","BFS (level order)","Any traversal that visits leaves"], correct: 3, explain: "Any DFS/BFS that visits every leaf left-to-right works; in-order/pre/post traversals all visit leaves in left-to-right order for binary trees." },
      { id: "dsa_l1_8", q: "What is the average-case time complexity of looking up a value in a hash table?", opts: ["O(1)","O(log n)","O(n)","O(n log n)"], correct: 0, explain: "With a good hash function and load factor, lookup is O(1) on average." },
      { id: "dsa_l1_9", q: "Which sorting algorithm is stable AND has worst-case O(n log n)?", opts: ["QuickSort","HeapSort","MergeSort","SelectionSort"], correct: 2, explain: "MergeSort is stable and guaranteed O(n log n); HeapSort is O(n log n) but not stable." },
      { id: "dsa_l1_10", q: "A priority queue is most commonly implemented using which data structure?", opts: ["Array","Linked List","Heap","Stack"], correct: 2, explain: "Binary heaps give O(log n) insert and extract-min/max." },
      { id: "dsa_l1_11", q: "What does the height of a balanced binary tree with n nodes approximate to?", opts: ["O(n)","O(log n)","O(√n)","O(1)"], correct: 1, explain: "Balanced binary trees have height ⌊log₂ n⌋ + 1." },
      { id: "dsa_l1_12", q: "What does Big-O notation describe?", opts: ["Best case run time","Average case","Upper bound on growth","Memory used"], correct: 2, explain: "Big-O is an asymptotic upper bound on the growth rate." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "dsa_l2_1", q: "Given two sorted arrays of size m and n, the most efficient algorithm to merge them runs in:", opts: ["O(m·n)","O(m + n)","O((m+n) log(m+n))","O(min(m,n))"], correct: 1, explain: "Two-pointer merge visits each element once → O(m+n)." },
      { id: "dsa_l2_2", q: "Which traversal of a binary tree uses a queue iteratively?", opts: ["In-order","Pre-order","Post-order","Level-order (BFS)"], correct: 3, explain: "BFS uses a queue; DFS-style traversals use a stack/recursion." },
      { id: "dsa_l2_3", q: "Detecting a cycle in a singly linked list with O(1) extra space uses:", opts: ["Hash set of visited nodes","Floyd's slow/fast pointers","Reverse and compare","Recursion"], correct: 1, explain: "Tortoise-and-hare needs only two pointers — O(1) memory." },
      { id: "dsa_l2_4", q: "Best data structure for an LRU cache implementation:", opts: ["HashMap alone","Doubly linked list alone","HashMap + Doubly linked list","Single array"], correct: 2, explain: "HashMap gives O(1) lookup; doubly linked list gives O(1) move-to-front and eviction." },
      { id: "dsa_l2_5", q: "Dijkstra's shortest-path algorithm fails when:", opts: ["Graph is disconnected","Edges have negative weights","Graph is undirected","Graph has cycles"], correct: 1, explain: "Negative-weight edges break the greedy invariant. Use Bellman-Ford instead." },
      { id: "dsa_l2_6", q: "What is the optimal time complexity to find the kth smallest element in an unsorted array?", opts: ["O(n)","O(n log n)","O(n log k)","O(k)"], correct: 0, explain: "Quickselect averages O(n); using a min-heap of size k is O(n log k) but slower." },
      { id: "dsa_l2_7", q: "Which dynamic programming pattern fits the 0/1 Knapsack problem?", opts: ["1D dp[capacity]","2D dp[item][capacity]","Greedy by ratio","BFS with memoization"], correct: 1, explain: "Both item index and remaining capacity must be states → 2D DP (can be space-optimised to 1D in some implementations)." },
      { id: "dsa_l2_8", q: "Which of these problems has overlapping subproblems?", opts: ["Binary search","Fibonacci numbers (recursive)","Bubble sort","Insertion sort"], correct: 1, explain: "Naive recursive Fibonacci recomputes the same subproblems exponentially → DP candidate." },
      { id: "dsa_l2_9", q: "Topological sort is defined for which type of graph?", opts: ["Any graph","Undirected acyclic","Directed acyclic (DAG)","Connected weighted"], correct: 2, explain: "Topological order requires a DAG — directionality + no cycles." },
      { id: "dsa_l2_10", q: "Which is a valid invariant of a min-heap?", opts: ["Left child < right child","Parent ≤ both children","Root is the maximum","In-order traversal is sorted"], correct: 1, explain: "Min-heap property: every parent is ≤ its children. No ordering between siblings." },
      { id: "dsa_l2_11", q: "Reversing a linked list iteratively requires which extra memory?", opts: ["O(n)","O(log n)","O(1)","O(n²)"], correct: 2, explain: "Three pointer variables (prev, curr, next) are enough — O(1)." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "dsa_l3_1", q: "You're designing a feed for 100M users. To get the top 1000 most-liked posts in real time, you would:", opts: ["Sort all posts every request","Keep a min-heap of size 1000 updated on each like","Use a binary search tree","Re-sort every minute"], correct: 1, explain: "A bounded min-heap maintains the top-K with O(log K) per insert." },
      { id: "dsa_l3_2", q: "An interview problem asks you to find the longest substring without repeating characters in a long stream. The optimal approach is:", opts: ["Brute force all substrings — O(n³)","Sliding window with hash set — O(n)","Sort the string first","Recursive DP — O(n²)"], correct: 1, explain: "Sliding window expands right, contracts left when a duplicate appears → O(n)." },
      { id: "dsa_l3_3", q: "Given a directed graph with 10⁶ nodes, the most memory-efficient way to detect connected components is:", opts: ["Adjacency matrix + BFS","Adjacency list + Union-Find","Recursive DFS on adj matrix","Floyd-Warshall"], correct: 1, explain: "Adjacency list saves space for sparse graphs; Union-Find runs near-O(α(n))." },
      { id: "dsa_l3_4", q: "For a real-time autocomplete system over millions of search terms, the best base data structure is:", opts: ["Hash table of full strings","Trie (prefix tree)","Sorted array + binary search","Bloom filter"], correct: 1, explain: "Tries support prefix lookup in O(L) where L is query length; ideal for autocomplete." },
      { id: "dsa_l3_5", q: "You must shard a billion key-value pairs across N servers and minimize re-shard impact when a server is added. The right algorithm is:", opts: ["Modulo hashing (key % N)","Consistent hashing","Round-robin","Random assignment"], correct: 1, explain: "Consistent hashing only re-maps ~1/N keys when servers are added/removed — modulo re-maps almost everything." },
      { id: "dsa_l3_6", q: "A producer-consumer system needs FIFO ordering with O(1) push/pop and bounded memory. Best fit:", opts: ["Stack","Hash map","Circular buffer (ring queue)","Binary heap"], correct: 2, explain: "Ring buffers are O(1) FIFO with fixed memory — standard in OS pipes & sound buffers." },
    ], submission_pool: [
      { id: "dsa_l3_sub_1", prompt: "Paste a GitHub link to a project of yours that implements a non-trivial data structure (e.g. LRU cache, trie, segment tree, graph algorithm). Briefly describe what it does (3-5 sentences).", placeholder: "https://github.com/your-username/your-repo — brief description…" },
      { id: "dsa_l3_sub_2", prompt: "Walk through your approach to a hard LeetCode/HackerRank problem you've solved (paste the link + your approach in 100-200 words: brute force → optimal idea → complexity).", placeholder: "Problem link + approach…" },
    ]},
  },
};

const python: SkillBank = {
  name: "Python",
  aliases: ["python", "python programming"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "py_l1_1", q: "Which of these is NOT a built-in Python data type?", opts: ["list","dict","tuple","array"], correct: 3, explain: "`array` requires `import array`; the other three are built-in." },
      { id: "py_l1_2", q: "What is the output of `len('hello')`?", opts: ["4","5","6","Error"], correct: 1, explain: "len returns the number of characters: 5." },
      { id: "py_l1_3", q: "Which keyword defines a function in Python?", opts: ["function","def","fn","lambda"], correct: 1, explain: "`def` is the keyword. `lambda` creates anonymous functions." },
      { id: "py_l1_4", q: "What does `range(5)` produce?", opts: ["[1,2,3,4,5]","[0,1,2,3,4]","[0,1,2,3,4,5]","An infinite iterator"], correct: 1, explain: "range(stop) gives 0..stop-1." },
      { id: "py_l1_5", q: "Which operator does floor division in Python?", opts: ["/","//","%","**"], correct: 1, explain: "`//` is floor division; `/` returns a float." },
      { id: "py_l1_6", q: "What is the output of `bool([])`?", opts: ["True","False","None","Error"], correct: 1, explain: "Empty containers are falsy in Python." },
      { id: "py_l1_7", q: "Which of these is mutable?", opts: ["tuple","str","list","frozenset"], correct: 2, explain: "Lists are mutable; the other three are immutable." },
      { id: "py_l1_8", q: "What does `list('abc')` produce?", opts: ["'abc'","['abc']","['a','b','c']","[a,b,c]"], correct: 2, explain: "Iterating a string yields its characters; list() collects them." },
      { id: "py_l1_9", q: "Which method adds an item to the end of a list?", opts: [".add()",".append()",".push()",".insert()"], correct: 1, explain: "Lists use append() (and insert(i,x) for arbitrary positions)." },
      { id: "py_l1_10", q: "How do you handle exceptions in Python?", opts: ["try/catch","try/except","throw/catch","handle/error"], correct: 1, explain: "Python uses `try`/`except` (and optional `finally`/`else`)." },
      { id: "py_l1_11", q: "What is the output of `'abc' * 2`?", opts: ["abc abc","abcabc","Error","6"], correct: 1, explain: "String multiplication concatenates; 'abc'*2 → 'abcabc'." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "py_l2_1", q: "What does this list comprehension produce: `[x*x for x in range(4) if x%2==0]`?", opts: ["[0,4]","[0,1,4,9]","[0,2]","[0,4,16]"], correct: 0, explain: "Even x in 0..3 are 0 and 2; squared: [0, 4]." },
      { id: "py_l2_2", q: "What is `*args` used for in a function signature?", opts: ["Pointer to argument","Capture variadic positional args as tuple","Required keyword arg","Argument multiplication"], correct: 1, explain: "*args collects extra positional args into a tuple. **kwargs does the same for keyword args (as dict)." },
      { id: "py_l2_3", q: "Decorators in Python are essentially:", opts: ["Comments","Functions that take/return functions","Inheritance modifiers","Type hints"], correct: 1, explain: "Decorators wrap a function, returning a new callable." },
      { id: "py_l2_4", q: "What's the difference between `==` and `is`?", opts: ["No difference","== checks value, is checks identity","is checks value, == checks identity","Both check identity"], correct: 1, explain: "`==` calls __eq__ on values; `is` compares object identity (memory address)." },
      { id: "py_l2_5", q: "What does `list(map(str, [1,2,3]))` return?", opts: ["[1,2,3]","['1','2','3']","['1, 2, 3']","Error"], correct: 1, explain: "map applies str to each element; list() materialises the iterator." },
      { id: "py_l2_6", q: "Which is true about Python's GIL (Global Interpreter Lock)?", opts: ["Allows true parallel threads on multi-core","Serialises bytecode execution across threads","Only exists in PyPy","Disables threading entirely"], correct: 1, explain: "CPython's GIL allows only one thread to run Python bytecode at a time. Use multiprocessing for CPU-bound parallelism." },
      { id: "py_l2_7", q: "What does this output: `d = {'a': 1, 'b': 2}; print(d.get('c', 0))`?", opts: ["KeyError","None","0","'c'"], correct: 2, explain: ".get(key, default) returns default when key missing." },
      { id: "py_l2_8", q: "Which is the correct way to open a file safely?", opts: ["f = open('a.txt')","with open('a.txt') as f:","f = file('a.txt')","open_safe('a.txt')"], correct: 1, explain: "Context managers (`with`) ensure the file closes on exit, even on exception." },
      { id: "py_l2_9", q: "What does `yield` do in a function?", opts: ["Returns and exits","Pauses and returns a value, resumable","Throws an error","Same as return"], correct: 1, explain: "yield turns a function into a generator that lazily produces values." },
      { id: "py_l2_10", q: "Best way to iterate a dict's items in Python 3:", opts: ["for k in d:","for k,v in d.items():","for k,v in d:","for v in d.values(): k = d.keys()"], correct: 1, explain: "d.items() yields (key, value) pairs efficiently." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "py_l3_1", q: "Reading a 50 GB CSV file in Python without running out of memory — which approach is correct?", opts: ["pandas.read_csv all at once","csv.reader with iterator + chunked processing","json.load on the file","Read all into a list of dicts"], correct: 1, explain: "Stream the file line by line with csv.reader / pandas chunksize=N." },
      { id: "py_l3_2", q: "You need to parallelise a CPU-bound task. The best Python approach is:", opts: ["threading.Thread","multiprocessing.Pool","asyncio.gather","concurrent.futures.ThreadPoolExecutor"], correct: 1, explain: "GIL prevents threading from helping CPU-bound work; multiprocessing bypasses it via separate processes." },
      { id: "py_l3_3", q: "An LRU cache decorator for an expensive pure function is best implemented using:", opts: ["@lru_cache from functools","Manual dict that never evicts","Global variable","try/except KeyError"], correct: 0, explain: "functools.lru_cache(maxsize=N) handles caching + eviction transparently." },
      { id: "py_l3_4", q: "You're writing a microservice that handles 10K concurrent IO-bound requests. Which model is best?", opts: ["multiprocessing","threading.Thread per request","asyncio with aiohttp","subprocess.Popen"], correct: 2, explain: "Async IO scales to thousands of in-flight requests on a single thread — best for IO-bound workloads." },
      { id: "py_l3_5", q: "What's the safest way to deep-copy a nested mutable structure?", opts: ["dict(d)","copy.copy(d)","copy.deepcopy(d)","d[:]"], correct: 2, explain: "Only deepcopy recursively duplicates nested mutable objects." },
      { id: "py_l3_6", q: "Which Python type-hint syntax is correct for a function returning a list of integers?", opts: ["def f() -> [int]:","def f() -> list<int>:","def f() -> list[int]:","def f() -> List(int):"], correct: 2, explain: "PEP 585 allows `list[int]` directly (Python 3.9+). `List[int]` from typing also works." },
    ], submission_pool: [
      { id: "py_l3_sub_1", prompt: "Paste a link to a Python project of yours (web app, ML notebook, automation script). Briefly describe (3-5 sentences) the problem solved and which Python features you used.", placeholder: "GitHub/Colab link — description…" },
      { id: "py_l3_sub_2", prompt: "Explain in 100-200 words how you would profile and optimize a slow Python function. List at least one tool you'd use.", placeholder: "My approach…" },
    ]},
  },
};

const sql: SkillBank = {
  name: "SQL & Databases",
  aliases: ["sql", "databases", "dbms", "rdbms"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "sql_l1_1", q: "Which keyword filters rows AFTER a GROUP BY?", opts: ["WHERE","HAVING","FILTER","GROUP-BY-WHERE"], correct: 1, explain: "WHERE filters before grouping; HAVING filters aggregated groups." },
      { id: "sql_l1_2", q: "Which JOIN returns ALL rows from the left table even when no match?", opts: ["INNER JOIN","LEFT JOIN","RIGHT JOIN","CROSS JOIN"], correct: 1, explain: "LEFT JOIN keeps every left row, with NULLs where the right side has no match." },
      { id: "sql_l1_3", q: "Which SQL clause is used to remove duplicate rows from results?", opts: ["UNIQUE","DISTINCT","DEDUPE","NO_DUPLICATE"], correct: 1, explain: "SELECT DISTINCT col FROM t — dedupes the result set." },
      { id: "sql_l1_4", q: "Default sort order of `ORDER BY col` (no direction specified):", opts: ["DESC","ASC","Random","Insertion order"], correct: 1, explain: "ORDER BY defaults to ASC (ascending)." },
      { id: "sql_l1_5", q: "Which is NOT a valid aggregate function?", opts: ["SUM","AVG","COUNT","JOIN"], correct: 3, explain: "JOIN combines tables; the others are aggregates." },
      { id: "sql_l1_6", q: "A PRIMARY KEY constraint guarantees:", opts: ["Indexed column","Unique + NOT NULL","Foreign reference","Auto increment"], correct: 1, explain: "Primary key is unique and never NULL. (Most DBMSes also auto-index it.)" },
      { id: "sql_l1_7", q: "What does `SELECT COUNT(*) FROM users` return?", opts: ["Number of unique users","Number of rows in users","Number of columns","Sum of user IDs"], correct: 1, explain: "COUNT(*) counts rows including those with NULLs." },
      { id: "sql_l1_8", q: "Which command permanently removes a table and its data?", opts: ["DELETE","DROP","TRUNCATE","REMOVE"], correct: 1, explain: "DROP removes the table itself. TRUNCATE empties it but keeps the schema. DELETE removes rows." },
      { id: "sql_l1_9", q: "What does `LIKE 'A%'` match?", opts: ["Strings ending in A","Strings starting with A","Strings containing A","Exactly 'A'"], correct: 1, explain: "% matches any sequence; 'A%' = starts with A." },
      { id: "sql_l1_10", q: "Which clause limits the number of rows returned in MySQL/Postgres?", opts: ["LIMIT","TOP","ROWNUM","FETCH"], correct: 0, explain: "LIMIT works in MySQL/Postgres/SQLite. SQL Server uses TOP, Oracle uses ROWNUM/FETCH." },
      { id: "sql_l1_11", q: "Which is a transaction property in ACID?", opts: ["Consistency","Caching","Compression","Concurrency"], correct: 0, explain: "ACID = Atomicity, Consistency, Isolation, Durability." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "sql_l2_1", q: "Find departments with > 5 employees: which structure is correct?", opts: ["WHERE COUNT(emp_id) > 5","GROUP BY dept HAVING COUNT(emp_id) > 5","SELECT dept WHERE > 5","JOIN with COUNT"], correct: 1, explain: "Aggregates can only be filtered with HAVING after GROUP BY." },
      { id: "sql_l2_2", q: "Which index is best for queries that frequently filter by `(country, city)` together?", opts: ["Two separate single-column indexes","One composite index on (country, city)","Index on country only","Full-text index"], correct: 1, explain: "Composite indexes serve multi-column predicates with one B-tree lookup." },
      { id: "sql_l2_3", q: "Which is true about a LEFT JOIN where the right table has no match?", opts: ["Row is excluded","Row appears with NULLs for right columns","Throws an error","Returns 0 instead of NULL"], correct: 1, explain: "Unmatched right side → NULLs preserve the left row." },
      { id: "sql_l2_4", q: "Window function ROW_NUMBER() OVER (PARTITION BY x ORDER BY y) returns:", opts: ["A running sum","Sequential row number within each partition","Distinct count","Random number"], correct: 1, explain: "Resets per partition, orders by y, assigns 1..N." },
      { id: "sql_l2_5", q: "Which scenario benefits MOST from denormalization?", opts: ["Heavy write workload","Read-heavy analytics queries","Strict ACID requirements","Frequent schema changes"], correct: 1, explain: "Denormalization trades write cost / storage for faster reads." },
      { id: "sql_l2_6", q: "If you UPDATE a row inside a transaction and then ROLLBACK:", opts: ["The change persists","The change is undone","The transaction commits anyway","Database errors"], correct: 1, explain: "ROLLBACK reverts all uncommitted changes in the transaction." },
      { id: "sql_l2_7", q: "Which JOIN returns the Cartesian product?", opts: ["INNER","LEFT","FULL OUTER","CROSS"], correct: 3, explain: "CROSS JOIN pairs every left row with every right row → m × n rows." },
      { id: "sql_l2_8", q: "EXPLAIN/EXPLAIN ANALYZE is used to:", opts: ["Add comments to a query","Show the query execution plan","Auto-fix slow queries","Backup the table"], correct: 1, explain: "EXPLAIN shows how the optimiser plans to execute the query — essential for performance tuning." },
      { id: "sql_l2_9", q: "Which subquery type can be replaced by an EXISTS clause for performance?", opts: ["IN (SELECT … )","SELECT in WHERE","FROM (SELECT … )","UNION subquery"], correct: 0, explain: "`WHERE x IN (SELECT …)` and `WHERE EXISTS (SELECT 1 …)` are often interchangeable; EXISTS short-circuits on first match." },
      { id: "sql_l2_10", q: "A foreign key with ON DELETE CASCADE means:", opts: ["Parent cannot be deleted","Child rows are deleted with parent","Foreign key is ignored","Triggers a stored proc"], correct: 1, explain: "CASCADE propagates the delete to dependent child rows." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "sql_l3_1", q: "An e-commerce order table grows to 1B rows. Queries by user_id slow down. The first thing to try is:", opts: ["Drop indexes","Add an index / partition by user_id","Switch to NoSQL","Increase RAM only"], correct: 1, explain: "Index/partition lets the planner narrow scans dramatically before considering hardware." },
      { id: "sql_l3_2", q: "Two transactions read row X and both write back X+1. Without proper isolation this causes:", opts: ["Phantom read","Lost update","Cache miss","Deadlock"], correct: 1, explain: "Lost update = both based decision on the original X; one overwrites the other." },
      { id: "sql_l3_3", q: "Reporting query runs once a day on huge transactional table and slows OLTP. Best fix:", opts: ["Run it during the day","Use a read replica or data warehouse","Drop indexes","Disable transactions"], correct: 1, explain: "Isolate analytical workload from transactional system via replica/warehouse." },
      { id: "sql_l3_4", q: "When would you prefer a NoSQL document store over a relational DB?", opts: ["Strict joins required","Flexible schema, denormalised reads, horizontal scale","Strong ACID multi-table txns","Complex aggregations across many tables"], correct: 1, explain: "Document stores shine for flexible schemas and horizontally scalable reads (e.g., session, catalog, content)." },
      { id: "sql_l3_5", q: "An EXPLAIN shows a Seq Scan on a table with millions of rows where you filter by `email = ?`. Most likely fix:", opts: ["Add LIMIT 1","Add an index on email","Increase work_mem","Use ORDER BY"], correct: 1, explain: "Sequential scan on a high-cardinality equality predicate → add a B-tree index." },
      { id: "sql_l3_6", q: "Which approach gives the strongest consistency in a distributed SQL system?", opts: ["Eventual consistency","Read-your-writes","Strict serializability","Last-writer-wins"], correct: 2, explain: "Strict serializability = transactions appear in some real-time order; strongest model (e.g., Spanner)." },
    ], submission_pool: [
      { id: "sql_l3_sub_1", prompt: "Share a link to a project where you used SQL non-trivially (analysis notebook, dashboard, app DB schema). Describe the schema and one query you found tricky (3-5 sentences).", placeholder: "Link + description…" },
      { id: "sql_l3_sub_2", prompt: "Walk through how you would design the schema for a movie-ticket-booking app (tables, primary/foreign keys, one tricky constraint). 100-200 words.", placeholder: "My schema design…" },
    ]},
  },
};

const aptitude: SkillBank = {
  name: "Aptitude & Logical Reasoning",
  aliases: ["aptitude", "logical reasoning", "reasoning"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "apt_l1_1", q: "If 5 workers complete a job in 12 days, how many days will 6 workers take (same productivity)?", opts: ["10","12","14.4","8"], correct: 0, explain: "Work = 60 worker-days; 60 / 6 = 10 days." },
      { id: "apt_l1_2", q: "What comes next: 2, 6, 12, 20, 30, ?", opts: ["36","40","42","45"], correct: 2, explain: "Differences are 4, 6, 8, 10, 12 → 30 + 12 = 42." },
      { id: "apt_l1_3", q: "20% of 250 = ?", opts: ["25","50","60","100"], correct: 1, explain: "0.20 × 250 = 50." },
      { id: "apt_l1_4", q: "If A:B = 2:3 and B:C = 4:5, then A:B:C = ?", opts: ["8:12:15","2:3:5","4:6:5","2:4:5"], correct: 0, explain: "Multiply A:B by 4 → 8:12; B:C by 3 → 12:15. So 8:12:15." },
      { id: "apt_l1_5", q: "Average of 10, 20, 30, 40, 50 = ?", opts: ["25","30","35","40"], correct: 1, explain: "Sum = 150; 150 / 5 = 30." },
      { id: "apt_l1_6", q: "A clock shows 3:15. The angle between hour and minute hands is closest to:", opts: ["0°","7.5°","15°","22.5°"], correct: 1, explain: "Hour hand at 3:15 is 7.5° past 3; minute hand at 15min = 90°. Hour at 90+7.5 = 97.5°. Difference = 7.5°." },
      { id: "apt_l1_7", q: "If a square has perimeter 36 cm, its area is:", opts: ["36 cm²","81 cm²","72 cm²","144 cm²"], correct: 1, explain: "Side = 36/4 = 9; area = 81 cm²." },
      { id: "apt_l1_8", q: "Speed: a train covers 180 km in 3 hours. Average speed?", opts: ["50 km/h","55 km/h","60 km/h","75 km/h"], correct: 2, explain: "180 / 3 = 60 km/h." },
      { id: "apt_l1_9", q: "Simple interest on ₹1000 for 2 years at 5% per annum is:", opts: ["₹50","₹100","₹150","₹200"], correct: 1, explain: "SI = P×R×T/100 = 1000×5×2/100 = ₹100." },
      { id: "apt_l1_10", q: "Find the odd one out: 25, 36, 49, 60, 64", opts: ["25","36","60","64"], correct: 2, explain: "25, 36, 49, 64 are perfect squares; 60 isn't." },
      { id: "apt_l1_11", q: "If x + 3 = 7, then 2x = ?", opts: ["4","8","10","14"], correct: 1, explain: "x = 4, so 2x = 8." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "apt_l2_1", q: "A boat goes 10 km downstream in 1 hour and returns in 2 hours. Speed of current?", opts: ["1.5","2.5","3.5","5"], correct: 1, explain: "Down = boat+current = 10; Up = boat-current = 5; current = (10-5)/2 = 2.5." },
      { id: "apt_l2_2", q: "If 8 men can do a work in 10 days working 6 hrs/day, how many days for 4 men working 8 hrs/day?", opts: ["10","12","15","20"], correct: 2, explain: "Total man-hours = 8×10×6 = 480; 480 / (4×8) = 15 days." },
      { id: "apt_l2_3", q: "A sum doubles in 8 years at simple interest. The annual rate is:", opts: ["10%","12.5%","15%","20%"], correct: 1, explain: "P doubles → SI = P; SI = P×R×T/100 → R = 100/8 = 12.5%." },
      { id: "apt_l2_4", q: "In a class of 50, 35 like tea, 25 like coffee, 10 like neither. How many like both?", opts: ["10","15","20","25"], correct: 2, explain: "Like tea or coffee = 50-10 = 40. Both = 35+25-40 = 20." },
      { id: "apt_l2_5", q: "Find the next term: 1, 4, 9, 16, 25, …", opts: ["30","32","36","40"], correct: 2, explain: "Squares of 1,2,3,4,5 → next is 6² = 36." },
      { id: "apt_l2_6", q: "The cost price of an item is ₹400; selling price is ₹500. Profit % = ?", opts: ["20%","25%","30%","40%"], correct: 1, explain: "Profit = 100; profit% = 100/400 × 100 = 25%." },
      { id: "apt_l2_7", q: "Which day of the week was 1 Jan 2000?", opts: ["Friday","Saturday","Sunday","Monday"], correct: 1, explain: "1 Jan 2000 was a Saturday (use Zeller's congruence or known calendar fact)." },
      { id: "apt_l2_8", q: "Compound interest on ₹1000 at 10% for 2 years (compounded annually):", opts: ["₹200","₹210","₹220","₹250"], correct: 1, explain: "1000 × 1.1² = 1210; CI = 210." },
      { id: "apt_l2_9", q: "If A is sister of B's father, what is A to B?", opts: ["Aunt","Cousin","Mother","Niece"], correct: 0, explain: "Father's sister = aunt." },
      { id: "apt_l2_10", q: "How many ways can 5 people sit in a row?", opts: ["25","60","120","720"], correct: 2, explain: "5! = 120." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "apt_l3_1", q: "From a bag with 4 red and 6 blue balls, two are drawn without replacement. P(both red) = ?", opts: ["2/15","3/25","6/45","4/15"], correct: 0, explain: "(4/10)·(3/9) = 12/90 = 2/15." },
      { id: "apt_l3_2", q: "A man invests ₹X at 5% and ₹2X at 8%. His average rate of return is:", opts: ["6.5%","7%","6%","7.5%"], correct: 1, explain: "(0.05X + 0.16X) / 3X = 0.21X / 3X = 7%." },
      { id: "apt_l3_3", q: "Three pipes A, B, C fill a tank in 6, 8, 12 hours respectively. All open together fill it in:", opts: ["2 hours 40 min","2 hours 30 min","3 hours","8/3 hours"], correct: 0, explain: "Combined rate = 1/6+1/8+1/12 = 4/24+3/24+2/24 = 9/24/h. Time = 24/9 = 2.67h ≈ 2h 40min." },
      { id: "apt_l3_4", q: "A and B can complete a task in 10 and 15 days respectively. They start together; B leaves after 4 days. Total days?", opts: ["6","7","8","9"], correct: 2, explain: "In 4 days: 4/10 + 4/15 = 12/30+8/30 = 20/30 = 2/3 done. Remaining 1/3 by A alone takes 1/3 × 10 = 10/3 ≈ 3.33; total ≈ 4 + 3.33 ≈ 8 days." },
      { id: "apt_l3_5", q: "If log₂ 8 = 3, then log₂ 32 = ?", opts: ["4","5","6","8"], correct: 1, explain: "32 = 2⁵ → log₂32 = 5." },
      { id: "apt_l3_6", q: "Five friends A,B,C,D,E are sitting in a row. C is right of B; A is left of B; D is right of C; E is at the right end. Position of A?", opts: ["1","2","3","4"], correct: 0, explain: "Order from left: A, B, C, D, E. A is at position 1." },
    ], submission_pool: [
      { id: "apt_l3_sub_1", prompt: "Solve a hard problem from any company aptitude paper (TCS NQT, Infosys, Wipro). Paste the question + your full step-by-step solution.", placeholder: "Question + solution…" },
      { id: "apt_l3_sub_2", prompt: "Pick a tricky logical-reasoning puzzle (seating, blood relations, Venn diagrams) and explain your thought process in 100-200 words.", placeholder: "Puzzle + my approach…" },
    ]},
  },
};

const oops: SkillBank = {
  name: "OOPs Concepts",
  aliases: ["oop", "oops", "object oriented"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 8, pool: [
      { id: "oop_l1_1", q: "Encapsulation refers to:", opts: ["Hiding internal data and exposing methods","Overriding methods","Multiple inheritance","Compile-time polymorphism"], correct: 0, explain: "Encapsulation = bundling data + methods + restricting direct access (private fields, public getters)." },
      { id: "oop_l1_2", q: "Which is NOT a pillar of OOP?", opts: ["Inheritance","Polymorphism","Compilation","Encapsulation"], correct: 2, explain: "The four pillars: Encapsulation, Abstraction, Inheritance, Polymorphism." },
      { id: "oop_l1_3", q: "Method overloading achieves which type of polymorphism?", opts: ["Runtime","Compile-time","Both","Neither"], correct: 1, explain: "Overloading is resolved at compile time via signatures; overriding gives runtime polymorphism." },
      { id: "oop_l1_4", q: "An abstract class can:", opts: ["Be instantiated directly","Have both abstract and concrete methods","Only have abstract methods","Only have static methods"], correct: 1, explain: "Abstract classes can mix abstract and implemented methods." },
      { id: "oop_l1_5", q: "Inheritance enables:", opts: ["Code reuse via parent → child relationship","Hiding data","Method overloading","Operator definition"], correct: 0, explain: "Inheritance = a child class reuses/extends parent behaviour." },
      { id: "oop_l1_6", q: "Which keyword in Java prevents inheritance?", opts: ["static","final","abstract","private"], correct: 1, explain: "`final class X` cannot be subclassed; `final method` cannot be overridden." },
      { id: "oop_l1_7", q: "An interface in Java (pre-default-methods) contains:", opts: ["Concrete methods","Only method signatures (abstract by default)","Only fields","Constructor"], correct: 1, explain: "Interfaces declare contracts — methods are implicitly public abstract." },
      { id: "oop_l1_8", q: "What is method overriding?", opts: ["Same name + different params","Subclass redefines a parent method with same signature","Multiple methods of same name","Static binding"], correct: 1, explain: "Override = subclass replaces parent's implementation with same signature." },
      { id: "oop_l1_9", q: "Which is true about constructors?", opts: ["Have a return type","Are inherited","Have the same name as the class","Cannot be overloaded"], correct: 2, explain: "Constructors share the class name and have no return type. They can be overloaded." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 8, pool: [
      { id: "oop_l2_1", q: "Composition over inheritance is preferred because:", opts: ["It's faster","It avoids tight coupling and rigid hierarchies","It uses more memory","Inheritance is deprecated"], correct: 1, explain: "Composition gives flexible, runtime-changeable relationships; inheritance creates rigid 'is-a' chains." },
      { id: "oop_l2_2", q: "Liskov Substitution Principle says:", opts: ["Subtypes must be substitutable for their base types","Functions should be small","Avoid global state","Use composition over inheritance"], correct: 0, explain: "LSP: code using a base class should work correctly with any subclass without surprises." },
      { id: "oop_l2_3", q: "What does the Single Responsibility Principle (SRP) state?", opts: ["A class should do one thing well","One class per file","One method per class","All classes inherit from Object"], correct: 0, explain: "SRP: a class should have only one reason to change." },
      { id: "oop_l2_4", q: "Java's `final` field with no initial assignment must be initialised:", opts: ["Lazily","Anywhere before use","In the constructor","In a setter"], correct: 2, explain: "Final fields must be assigned exactly once — either at declaration or in every constructor." },
      { id: "oop_l2_5", q: "What is a 'has-a' relationship in OOP?", opts: ["Inheritance","Composition / aggregation","Polymorphism","Encapsulation"], correct: 1, explain: "Composition: an object holds another as a field — Car has-a Engine." },
      { id: "oop_l2_6", q: "Which design pattern restricts a class to a single instance?", opts: ["Factory","Singleton","Observer","Decorator"], correct: 1, explain: "Singleton ensures one shared instance with global access." },
      { id: "oop_l2_7", q: "What's the diamond problem in multiple inheritance?", opts: ["Memory leak","Ambiguity when two parent classes define the same method","Compile error","Stack overflow"], correct: 1, explain: "If both parents inherit from a common grandparent, the child has ambiguous method resolution. Java solves it by allowing only single class inheritance + multiple interfaces." },
      { id: "oop_l2_8", q: "When you override `equals()` in Java, you should also override:", opts: ["toString","hashCode","compareTo","clone"], correct: 1, explain: "equals/hashCode contract: equal objects must have equal hashCodes — required by HashMap/Set." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "oop_l3_1", q: "You have a Notification system with email/SMS/push channels. Best pattern to add a new channel without modifying existing code:", opts: ["if/else cascade","Strategy + Open/Closed Principle","Singleton","Template method only"], correct: 1, explain: "Strategy lets you plug in new channels via interface; OCP keeps existing classes untouched." },
      { id: "oop_l3_2", q: "Two services need to react to 'order placed' events. Best decoupling pattern:", opts: ["Direct method calls","Observer / Event bus","Singleton","Visitor"], correct: 1, explain: "Observer/event bus broadcasts events; subscribers react independently." },
      { id: "oop_l3_3", q: "A complex object needs to be built step-by-step with optional fields. Best pattern:", opts: ["Builder","Singleton","Adapter","Decorator"], correct: 0, explain: "Builder offers a fluent step-by-step construction API; great for objects with many optional fields." },
      { id: "oop_l3_4", q: "You're integrating a 3rd-party library whose interface doesn't match yours. Pattern to use:", opts: ["Singleton","Adapter","Observer","State"], correct: 1, explain: "Adapter wraps the foreign interface and exposes one your code understands." },
      { id: "oop_l3_5", q: "Which violates SOLID — a payment service that knows about Stripe AND PayPal AND Razorpay internally?", opts: ["Single Responsibility","Open/Closed","Both SRP & OCP","None"], correct: 2, explain: "It does too many things (SRP) and must be modified for every new gateway (OCP)." },
      { id: "oop_l3_6", q: "Encapsulation in microservices typically maps to:", opts: ["Each service owns its data store","Shared DB across services","Public mutable globals","One database per company"], correct: 0, explain: "Database-per-service preserves encapsulation and bounded contexts." },
    ], submission_pool: [
      { id: "oop_l3_sub_1", prompt: "Share a project where you used at least 2 design patterns. Name each pattern + describe where you used it (3-5 sentences total).", placeholder: "Project link + patterns used…" },
      { id: "oop_l3_sub_2", prompt: "Describe in 100-200 words an application of SOLID principles (any two) in code you've written.", placeholder: "My example…" },
    ]},
  },
};

const os: SkillBank = {
  name: "Operating Systems",
  aliases: ["os", "operating system"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 8, pool: [
      { id: "os_l1_1", q: "Which of these is NOT a typical OS responsibility?", opts: ["Process scheduling","Memory management","File I/O","Compiling source code"], correct: 3, explain: "Compilation is done by compilers (separate user-space tools), not the OS." },
      { id: "os_l1_2", q: "A process and a thread differ in that:", opts: ["Threads have their own memory space","Processes share memory with parents","Threads share the parent process's address space","No difference"], correct: 2, explain: "Threads of one process share heap/code; processes have isolated address spaces." },
      { id: "os_l1_3", q: "Which scheduling algorithm has the lowest average waiting time for a known set of jobs?", opts: ["FCFS","Round Robin","Shortest Job First (SJF)","Priority"], correct: 2, explain: "SJF is provably optimal for average wait time but requires job-length knowledge." },
      { id: "os_l1_4", q: "Deadlock requires all of the following EXCEPT:", opts: ["Mutual exclusion","Hold and wait","No preemption","Round robin"], correct: 3, explain: "Coffman conditions: mutual exclusion, hold-and-wait, no-preemption, circular wait." },
      { id: "os_l1_5", q: "A page fault occurs when:", opts: ["Free memory is full","A referenced page is not in physical memory","The page table is corrupted","CPU overheats"], correct: 1, explain: "Page fault → OS fetches the page from disk and updates the page table." },
      { id: "os_l1_6", q: "Virtual memory enables:", opts: ["Faster RAM","Programs larger than physical RAM via paging","Encryption","Free CPU"], correct: 1, explain: "Virtual memory uses disk-backed pages so program size > RAM is possible." },
      { id: "os_l1_7", q: "Which is a synchronization primitive?", opts: ["Semaphore","Pointer","Compiler","Filesystem"], correct: 0, explain: "Semaphores, mutexes, monitors are sync primitives. Mutex = binary semaphore." },
      { id: "os_l1_8", q: "What does the kernel do?", opts: ["Manages user GUIs","Mediates between hardware and processes","Compiles code","Backs up files"], correct: 1, explain: "Kernel = core OS layer that provides syscalls and manages CPU/memory/IO." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 8, pool: [
      { id: "os_l2_1", q: "Round Robin scheduling with very small time quantum primarily causes:", opts: ["Starvation","High context-switch overhead","Deadlock","Cache misses only"], correct: 1, explain: "Tiny quantum → frequent switches → context-switch dominates real work." },
      { id: "os_l2_2", q: "A condition variable is used to:", opts: ["Wait until a predicate becomes true","Lock memory","Schedule the CPU","Encrypt files"], correct: 0, explain: "Condition variables block a thread until another signals a condition (used with a mutex)." },
      { id: "os_l2_3", q: "Which page replacement algorithm is theoretically optimal?", opts: ["FIFO","LRU","Belady's Optimal (replace page used furthest in future)","Random"], correct: 2, explain: "Belady's algorithm minimises page faults — but unimplementable in practice (needs future knowledge)." },
      { id: "os_l2_4", q: "Thrashing in virtual memory occurs when:", opts: ["CPU is idle","Page-fault rate is so high CPU spends all time paging","Disk fails","Files are encrypted"], correct: 1, explain: "Working set > physical memory → constant paging → no useful progress." },
      { id: "os_l2_5", q: "Which IPC mechanism is generally fastest within one machine?", opts: ["Pipes","Sockets","Shared memory","HTTP"], correct: 2, explain: "Shared memory has no kernel copying — once mapped, processes directly read/write." },
      { id: "os_l2_6", q: "fork() returns to the child:", opts: ["Child's PID","0","Parent's PID","-1"], correct: 1, explain: "fork() returns 0 to the child and the child's PID to the parent (or -1 on failure)." },
      { id: "os_l2_7", q: "A spinlock is preferable to a mutex when:", opts: ["Critical section is very long","Critical section is very short and contention is low","Many threads sleep","On a single-core system"], correct: 1, explain: "Spinning is cheaper than the kernel's sleep/wake cost only for very short critical sections on multi-core." },
      { id: "os_l2_8", q: "Which scheduling policy is best for interactive systems?", opts: ["FCFS","SJF","Multi-level feedback queue / Round Robin","Priority only"], correct: 2, explain: "Interactive systems favour responsiveness — RR or MLFQ keep latency low for short tasks." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "os_l3_1", q: "You suspect a deadlock in a production multi-threaded service. The MOST direct diagnostic is:", opts: ["Restart the service","Capture a thread dump and inspect lock chains","Increase RAM","Switch to a single thread"], correct: 1, explain: "Thread dumps (jstack/py-spy/gdb) reveal which thread holds which lock and waits on what." },
      { id: "os_l3_2", q: "A web server with 10K concurrent connections benefits MOST from:", opts: ["Thread per connection","Event loop / async IO (epoll/kqueue)","fork per connection","Single thread blocking IO"], correct: 1, explain: "Async IO scales beyond C10K by multiplexing many sockets on few threads." },
      { id: "os_l3_3", q: "A daemon process keeps growing memory but no leak in your code. First place to inspect:", opts: ["GC logs / heap snapshots","Network bandwidth","Disk speed","CPU temperature"], correct: 0, explain: "Heap snapshots (or RSS over time) show what objects are retained — even native allocations sometimes leak via GC roots." },
      { id: "os_l3_4", q: "On Linux, how do you reduce the cost of frequent context switches between two cooperating processes?", opts: ["Run them on different CPUs","Use shared memory and busy-wait","Use co-routines/async or shared memory + semaphores","Increase priority"], correct: 2, explain: "Sharing address space (threads or shared memory) avoids the cost of full process switches; or use coroutines for cooperative multitasking." },
      { id: "os_l3_5", q: "Which approach gives strongest isolation while still allowing many tenants on one host?", opts: ["Threads","Containers","Virtual machines","Processes"], correct: 2, explain: "VMs virtualise the entire OS — strongest isolation. Containers share the kernel but isolate namespaces — lighter but weaker." },
      { id: "os_l3_6", q: "Disk IO is randomly slow on a busy server. Best metric to start with:", opts: ["CPU temperature","iowait % and disk queue length","RAM voltage","Network bytes/sec"], correct: 1, explain: "iowait shows CPU stalled on IO; queue length reveals disk saturation." },
    ], submission_pool: [
      { id: "os_l3_sub_1", prompt: "Describe (with code link if available) a project where you used multi-threading or async IO. What synchronisation primitives did you need? 100-200 words.", placeholder: "Project + sync details…" },
      { id: "os_l3_sub_2", prompt: "Walk through how you'd debug a process that's using 100% CPU on a Linux server. List specific tools (top, perf, strace, etc).", placeholder: "My debugging steps…" },
    ]},
  },
};

const reactjs: SkillBank = {
  name: "React / JavaScript",
  aliases: ["react", "javascript", "js", "frontend", "react js", "reactjs", "react / javascript"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "rjs_l1_1", q: "Which keyword is used to declare a variable whose value cannot be reassigned in JavaScript?", opts: ["var","let","const","static"], correct: 2, explain: "`const` prevents reassignment; `let` and `var` allow it." },
      { id: "rjs_l1_2", q: "What does JSX stand for?", opts: ["JavaScript XML","Java Syntax Extension","JSON X-language","JavaScript Extra"], correct: 0, explain: "JSX = JavaScript XML — a syntax extension that lets you write HTML-like code in JS." },
      { id: "rjs_l1_3", q: "Which React hook lets you add state to a functional component?", opts: ["useEffect","useContext","useState","useRef"], correct: 2, explain: "`useState` returns a state variable and its setter; re-renders on change." },
      { id: "rjs_l1_4", q: "What is the correct way to pass a prop called `title` with value 'Hello' to a component?", opts: ["<Comp title='Hello' />","<Comp>title=Hello</Comp>","<Comp {title: 'Hello'} />","<Comp props.title='Hello' />"], correct: 0, explain: "Props are passed as JSX attributes: `<Comp title='Hello' />`." },
      { id: "rjs_l1_5", q: "Which array method returns a new array with each element transformed by a callback?", opts: ["filter()","forEach()","map()","reduce()"], correct: 2, explain: "`Array.map()` returns a new array of the same length with transformed elements." },
      { id: "rjs_l1_6", q: "What does `===` check in JavaScript?", opts: ["Value equality only","Type equality only","Both value and type equality","Reference equality"], correct: 2, explain: "Strict equality (`===`) checks type AND value — no type coercion." },
      { id: "rjs_l1_7", q: "In React, when should you use `key` props on list items?", opts: ["Only with nested lists","Always when rendering a list from an array","Only in class components","Only with images"], correct: 1, explain: "Keys help React identify which list items changed. Always provide them in array-rendered lists." },
      { id: "rjs_l1_8", q: "What is the output of `typeof null` in JavaScript?", opts: ['"null"','"undefined"','"object"','"boolean"'], correct: 2, explain: "A historical JS bug — `typeof null === 'object'` even though null is not an object." },
      { id: "rjs_l1_9", q: "Which hook runs a side-effect after every render by default?", opts: ["useState","useCallback","useRef","useEffect"], correct: 3, explain: "`useEffect(() => {...})` with no deps array runs after every render." },
      { id: "rjs_l1_10", q: "How do you prevent a form's default browser submission in JavaScript?", opts: ["return false in JSX","event.stopPropagation()","event.preventDefault()","form.disable()"], correct: 2, explain: "`event.preventDefault()` stops the browser's default action (page reload on submit)." },
      { id: "rjs_l1_11", q: "What does the spread operator `...` do when used with an object?", opts: ["Merges two objects","Deletes object keys","Converts object to array","Freezes the object"], correct: 0, explain: "`{ ...obj1, ...obj2 }` creates a shallow merge of both objects." },
      { id: "rjs_l1_12", q: "Which of the following correctly lifts state to a parent component in React?", opts: ["Define state in child, import it in parent","Pass setState as a prop to the child","Use window.state","Use Redux in child only"], correct: 1, explain: "Lifting state up = define state in parent, pass the setter function as a prop to child." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "rjs_l2_1", q: "What is a JavaScript closure?", opts: ["A function with no return value","A function that captures variables from its outer scope","A class method","An async function"], correct: 1, explain: "A closure is a function that retains access to variables in its defining (lexical) scope even after that scope has returned." },
      { id: "rjs_l2_2", q: "What is the purpose of `useCallback` in React?", opts: ["Memoizes a computed value","Memoizes a function reference","Handles async effects","Replaces useState"], correct: 1, explain: "`useCallback` returns a stable function reference, preventing unnecessary re-renders of child components that receive it as a prop." },
      { id: "rjs_l2_3", q: "What does the JavaScript event loop do?", opts: ["Handles DOM updates only","Runs microtasks and macrotasks in a prioritised queue, enabling non-blocking I/O","Manages garbage collection","Controls CSS repaints"], correct: 1, explain: "The event loop processes the call stack, then microtasks (Promises), then macrotasks (setTimeout) — making single-threaded JS non-blocking." },
      { id: "rjs_l2_4", q: "When does `useEffect` with a dependency array `[count]` run?", opts: ["Only on mount","Only on unmount","After every render where `count` changed","Before every render"], correct: 2, explain: "It runs on mount, then again whenever `count` changes between renders." },
      { id: "rjs_l2_5", q: "What problem does React.memo solve?", opts: ["Avoids re-rendering a component when its props haven't changed","Caches API responses","Prevents state updates","Fixes key prop warnings"], correct: 0, explain: "`React.memo` is a higher-order component that shallowly compares props and skips re-render if they're the same." },
      { id: "rjs_l2_6", q: "What is the difference between `null` and `undefined` in JavaScript?", opts: ["No difference","null is assigned intentionally; undefined means a variable was declared but not assigned","undefined is assigned intentionally; null means missing","null is a number, undefined is a string"], correct: 1, explain: "`null` is an explicit 'no value' assignment; `undefined` means the variable exists but has no assigned value." },
      { id: "rjs_l2_7", q: "Which statement about Promises is TRUE?", opts: ["Promises block the main thread","A Promise has three states: pending, fulfilled, rejected","Promises can only be created with async/await","fetch() does not return a Promise"], correct: 1, explain: "Promises represent eventual completion/failure — they transition from pending to fulfilled or rejected." },
      { id: "rjs_l2_8", q: "What does `Array.reduce()` do?", opts: ["Filters elements by condition","Transforms array to a single accumulated value","Returns a subset of the array","Sorts the array"], correct: 1, explain: "`reduce((acc, cur) => ..., init)` folds an array into a single output value." },
      { id: "rjs_l2_9", q: "In React controlled components, where is form state stored?", opts: ["DOM only","Browser session","React component state","Window object"], correct: 2, explain: "A controlled component drives input values from React state, not the DOM." },
      { id: "rjs_l2_10", q: "What is prop drilling?", opts: ["Passing props through many nested components that don't need them","Using Redux instead of props","Drilling down into the DOM","Debugging prop types"], correct: 0, explain: "Prop drilling = passing data through layers of components just to reach a deeply nested consumer — often solved with Context or state management." },
      { id: "rjs_l2_11", q: "What is the output of: `console.log(1 + '2' + 3)`?", opts: ['"123"','"6"','"33"','Error'], correct: 0, explain: "JS evaluates left-to-right: `1 + '2'` coerces to `'12'`, then `'12' + 3 = '123'`." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "rjs_l3_1", q: "A React dashboard re-renders 200ms on every state update. The best targeted fix is:", opts: ["Rewrite in class components","Code-split the whole dashboard","Profile with React DevTools, then memoize expensive subtrees with React.memo + useMemo","Move all state to Redux"], correct: 2, explain: "Profile first to identify hot paths, then memoize to skip re-renders of stable subtrees." },
      { id: "rjs_l3_2", q: "You have a large list of 10,000 rows. The UX is sluggish. The correct approach is:", opts: ["Paginate on the server or use virtual scrolling (react-window/react-virtual)","Wrap in a Web Worker","Switch to class components","Use inline styles"], correct: 0, explain: "Server pagination or windowing (only rendering visible rows) eliminates the DOM bottleneck." },
      { id: "rjs_l3_3", q: "To share auth state across a deep component tree without prop drilling, you would:", opts: ["Use window.auth","Lift state to App and pass via Redux","Use React Context with a provider at the root","Copy state to every component"], correct: 2, explain: "React Context provides a single source of truth accessible anywhere in the tree below the Provider." },
      { id: "rjs_l3_4", q: "A user reports a memory leak — the page slows down over hours. Most likely cause in a React SPA:", opts: ["Too many useState calls","Event listeners or subscriptions added in useEffect not cleaned up on unmount","Redux store growing","Too many keys"], correct: 1, explain: "Missing cleanup in useEffect (returning a teardown function) causes listeners/timers to pile up across mounts." },
      { id: "rjs_l3_5", q: "For a production React app, which bundle optimisation is most impactful for initial load?", opts: ["Using CSS modules","Route-based code splitting with React.lazy + Suspense","Switching to Preact","Enabling StrictMode"], correct: 1, explain: "Code splitting defers loading of page-specific JS until navigation — dramatically reduces initial bundle." },
    ], submission_pool: [
      { id: "rjs_l3_sub_1", prompt: "Paste a GitHub link to a React project you built. In 3-5 sentences describe the architecture: what state management approach you used, any performance optimisations, and what you'd do differently now.", placeholder: "https://github.com/… + description" },
      { id: "rjs_l3_sub_2", prompt: "Explain how you'd implement infinite scroll in a React feed page (no library). Describe state, the scroll-event listener, API call, cleanup, and why this avoids memory leaks. (~150 words)", placeholder: "My implementation approach…" },
    ]},
  },
};

const ml: SkillBank = {
  name: "Machine Learning Basics",
  aliases: ["ml", "machine learning", "deep learning", "ai basics", "ml basics"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "ml_l1_1", q: "Which type of ML learns from labelled input-output pairs?", opts: ["Unsupervised learning","Reinforcement learning","Supervised learning","Transfer learning"], correct: 2, explain: "Supervised = labelled examples (input → known output). Model learns the mapping." },
      { id: "ml_l1_2", q: "In a classification problem, the model predicts:", opts: ["A continuous numeric value","A discrete class/category","The next data point","A probability distribution over features"], correct: 1, explain: "Classification outputs a class label (cat/dog, spam/not-spam); regression outputs a number." },
      { id: "ml_l1_3", q: "What is overfitting?", opts: ["Model performs equally on train and test","Model performs well on training data but poorly on unseen data","Model converges too slowly","Model uses too few features"], correct: 1, explain: "Overfitting = memorising training noise — the model fails to generalise." },
      { id: "ml_l1_4", q: "Which algorithm draws a maximum-margin hyperplane between classes?", opts: ["K-Means","Linear Regression","SVM (Support Vector Machine)","K-Nearest Neighbours"], correct: 2, explain: "SVMs maximise the margin between the nearest points (support vectors) of each class." },
      { id: "ml_l1_5", q: "What does the 'training set' refer to?", opts: ["Data withheld to evaluate final performance","Data used to fit the model parameters","Data used for hyperparameter tuning","All available data"], correct: 1, explain: "Training data is what the model sees and learns from during training." },
      { id: "ml_l1_6", q: "K-Means is an example of:", opts: ["Supervised learning","Reinforcement learning","Semi-supervised learning","Unsupervised learning"], correct: 3, explain: "K-Means clusters unlabelled data — no target labels required." },
      { id: "ml_l1_7", q: "What does 'feature' mean in ML?", opts: ["The output variable","An individual measurable input property of the data","The algorithm itself","The loss function"], correct: 1, explain: "Features are the input variables (columns) the model uses to make predictions." },
      { id: "ml_l1_8", q: "Which metric measures the proportion of actual positives correctly identified?", opts: ["Precision","Accuracy","Recall (Sensitivity)","F1 Score"], correct: 2, explain: "Recall = TP / (TP + FN) — how many real positives did we catch?" },
      { id: "ml_l1_9", q: "What is the purpose of a train/test split?", opts: ["To reduce dataset size","To evaluate model performance on unseen data","To speed up training","To augment the data"], correct: 1, explain: "Holding out a test set simulates real-world unseen data — gives an honest accuracy estimate." },
      { id: "ml_l1_10", q: "Which of the following is a decision-tree ensemble method?", opts: ["Logistic Regression","K-Means","Random Forest","PCA"], correct: 2, explain: "Random Forest builds many decision trees on random subsets and aggregates predictions — an ensemble." },
      { id: "ml_l1_11", q: "What is 'bias' in the context of the bias-variance tradeoff?", opts: ["Systematic error from wrong assumptions in the model","Random error from training noise","Size of the training set","Learning rate"], correct: 0, explain: "High bias = model is too simple (underfits). Low bias + high variance = overfits." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "ml_l2_1", q: "Cross-validation is primarily used to:", opts: ["Preprocess features","Estimate model performance without a separate test set","Speed up training","Select the activation function"], correct: 1, explain: "k-Fold CV averages performance across k partitions — more reliable than a single split." },
      { id: "ml_l2_2", q: "What is gradient descent?", opts: ["A way to initialise weights","An iterative optimisation algorithm that moves parameters in the direction of the negative gradient of loss","A regularisation technique","A data augmentation method"], correct: 1, explain: "Gradient descent updates weights by ∂w = -η · ∇L to minimise the loss function." },
      { id: "ml_l2_3", q: "L2 regularisation (Ridge) penalises:", opts: ["Number of features","Absolute sum of weights","Sum of squared weights","Maximum weight"], correct: 2, explain: "Ridge adds λ·Σw² to the loss, shrinking weights towards zero without eliminating them." },
      { id: "ml_l2_4", q: "What does PCA (Principal Component Analysis) do?", opts: ["Classifies data points","Reduces dimensionality by projecting data onto directions of maximum variance","Clusters data","Augments data"], correct: 1, explain: "PCA finds orthogonal axes (principal components) of highest variance and projects data onto top-k of them." },
      { id: "ml_l2_5", q: "A ROC-AUC of 0.5 means:", opts: ["Perfect classifier","Model performs at random chance","Model is wrong 50% of the time","50% precision"], correct: 1, explain: "AUC=0.5 is equivalent to random guessing — the model has no discriminative power." },
      { id: "ml_l2_6", q: "Which activation function is most commonly used in hidden layers of deep networks today?", opts: ["Sigmoid","Tanh","ReLU","Step function"], correct: 2, explain: "ReLU avoids vanishing gradient problems, is computationally cheap, and trains fast." },
      { id: "ml_l2_7", q: "Feature normalisation (scaling to 0-1) is most important for which algorithm?", opts: ["Decision Trees","Random Forest","K-Nearest Neighbours (KNN)","Naive Bayes"], correct: 2, explain: "KNN and gradient-based models are distance/magnitude sensitive — tree-based models are not." },
      { id: "ml_l2_8", q: "What is a confusion matrix?", opts: ["A matrix showing correlation between features","A table showing TP, FP, FN, TN counts for a classifier","A weight matrix in neural networks","A cross-validation result grid"], correct: 1, explain: "Confusion matrix rows = actual class, columns = predicted class — from it you derive precision, recall, F1." },
      { id: "ml_l2_9", q: "What is the vanishing gradient problem?", opts: ["Gradient becomes too large and explodes","Gradient values become so small in early layers that weights barely update, stalling deep network training","Loss function is non-differentiable","Batch size is too small"], correct: 1, explain: "Sigmoid/tanh saturate — backpropagated gradients shrink exponentially through layers, making early layers learn very slowly." },
      { id: "ml_l2_10", q: "Which of the following is NOT a hyperparameter?", opts: ["Learning rate","Number of trees in a random forest","Model weights after training","Regularisation strength λ"], correct: 2, explain: "Weights are parameters (learned from data). Hyperparameters are set before training (learning rate, depth, etc.)." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "ml_l3_1", q: "A fraud detection model has 99% accuracy on an imbalanced dataset (0.1% fraud). Why is accuracy misleading here?", opts: ["It's correct — 99% is great","A dummy model predicting 'not fraud' always achieves 99.9% accuracy; recall/PR-AUC are needed","Accuracy always works for classification","The dataset is too small"], correct: 1, explain: "Class imbalance makes accuracy trivially high. Use recall, precision, F1, or PR-AUC." },
      { id: "ml_l3_2", q: "You train an XGBoost model but it overfits. The most effective set of mitigations is:", opts: ["Increase max_depth and learning rate","Reduce max_depth, add L2 regularisation, increase min_child_weight, use early stopping on validation","Delete more features","Increase n_estimators only"], correct: 1, explain: "Constraining tree depth, regularising, and early stopping are the standard XGBoost overfitting remedies." },
      { id: "ml_l3_3", q: "For a recommendation system at scale (millions of users × items), the preferred approach is:", opts: ["Decision tree on all user-item pairs","Collaborative filtering with matrix factorisation (ALS/SVD) or neural embedding models","K-Means on item features only","Linear regression per user"], correct: 1, explain: "Matrix factorisation decomposes the sparse user-item matrix into low-rank embeddings, scalable with ALS or deep models." },
      { id: "ml_l3_4", q: "You need to deploy an ML model to production for real-time inference under 50ms. Which strategy is most appropriate?", opts: ["Batch inference on a Spark cluster","Serve quantised/ONNX model behind a low-latency REST API with request batching","Re-train on every request","Use a Jupyter notebook server"], correct: 1, explain: "ONNX export, quantisation, and a dedicated inference server (TorchServe, TF Serving, FastAPI) give sub-50ms P99 latency." },
      { id: "ml_l3_5", q: "What is data leakage in ML?", opts: ["Missing values in the dataset","Using information from the future/test set during training, inflating evaluation metrics","Having too many features","Class imbalance"], correct: 1, explain: "Leakage = the model sees information during training that it wouldn't have at inference time — leading to overly optimistic evaluation." },
    ], submission_pool: [
      { id: "ml_l3_sub_1", prompt: "Describe an ML project you worked on: dataset, model choice, evaluation metric, and one problem you encountered (e.g. imbalance, overfitting). How did you solve it? (~150 words). Paste a Kaggle/GitHub link if available.", placeholder: "Project + description…" },
      { id: "ml_l3_sub_2", prompt: "Explain how you would approach building a real-time churn prediction system: feature engineering, model choice, serving infrastructure, and monitoring. (~150 words)", placeholder: "My design approach…" },
    ]},
  },
};

const systemDesign: SkillBank = {
  name: "System Design",
  aliases: ["system design", "hld", "lld", "distributed systems", "system design interview"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "sd_l1_1", q: "What does horizontal scaling mean?", opts: ["Adding more RAM to an existing server","Adding more servers to distribute the load","Moving the app to a bigger cloud region","Increasing CPU cores on one machine"], correct: 1, explain: "Horizontal scaling (scale-out) adds more machines; vertical (scale-up) adds resources to one machine." },
      { id: "sd_l1_2", q: "What is a load balancer?", opts: ["A database optimisation tool","A component that distributes incoming requests across multiple servers","A CDN node","A caching layer"], correct: 1, explain: "Load balancers (Nginx, AWS ELB) spread traffic across backend instances to prevent overload." },
      { id: "sd_l1_3", q: "What does CDN stand for and what is its primary purpose?", opts: ["Central Data Node — stores backups","Content Delivery Network — caches static assets geographically close to users","Cloud Deployment Node — runs containers","Continuous Data Network — streams video"], correct: 1, explain: "CDNs cache CSS/JS/images at edge PoPs worldwide, reducing latency for static content." },
      { id: "sd_l1_4", q: "What is a cache and why is it used?", opts: ["A slow disk-based store","A fast in-memory data store used to avoid repeated expensive computations or DB queries","A type of message queue","A firewall layer"], correct: 1, explain: "Caches (Redis, Memcached) store frequently read data in memory, reducing DB load and response time." },
      { id: "sd_l1_5", q: "What does REST stand for in API design?", opts: ["Remote Execution State Transfer","Representational State Transfer","Relational Endpoint Specification Transfer","Request-Exchange Standard Template"], correct: 1, explain: "REST is an architectural style using HTTP verbs (GET/POST/PUT/DELETE) and stateless client-server communication." },
      { id: "sd_l1_6", q: "Which database type stores data as documents (JSON-like)?", opts: ["Relational (SQL)","Document (NoSQL) e.g. MongoDB","Column-family e.g. Cassandra","Key-value e.g. Redis"], correct: 1, explain: "Document stores like MongoDB save flexible JSON-like objects without a fixed schema." },
      { id: "sd_l1_7", q: "What is a message queue used for?", opts: ["Storing database backups","Decoupling producers from consumers and enabling async processing","Caching HTML pages","Balancing database reads"], correct: 1, explain: "Message queues (Kafka, RabbitMQ) allow producers to push work and consumers to process it asynchronously." },
      { id: "sd_l1_8", q: "What does 'stateless' mean in a REST service?", opts: ["The service has no database","Each request contains all information needed; the server stores no session between requests","The service can't be restarted","No authentication is required"], correct: 1, explain: "Stateless servers can scale horizontally because any instance can handle any request independently." },
      { id: "sd_l1_9", q: "What is the primary role of an API Gateway?", opts: ["Stores API response data","Single entry point for clients — handles routing, auth, rate limiting, and aggregation","Compiles backend code","Manages DNS records"], correct: 1, explain: "API Gateways (AWS API GW, Kong) act as a reverse proxy: route requests, enforce auth/rate-limiting, and aggregate microservices." },
      { id: "sd_l1_10", q: "What is database indexing?", opts: ["Compressing database files","Creating a data structure that speeds up queries at the cost of extra storage and write overhead","Encrypting database columns","Sharding the database"], correct: 1, explain: "Indexes (B-tree, hash) allow O(log n) row lookup instead of O(n) full table scan." },
      { id: "sd_l1_11", q: "What is latency in system design context?", opts: ["Throughput of the system","Time taken for a single request to complete","Number of concurrent users","CPU utilisation percentage"], correct: 1, explain: "Latency = round-trip time for one request. Throughput = requests per second. Both matter." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "sd_l2_1", q: "The CAP theorem states that a distributed system can guarantee at most two of three properties. What are they?", opts: ["Cost, Availability, Performance","Consistency, Availability, Partition Tolerance","Caching, Atomicity, Persistence","Concurrency, Atomicity, Partition-safety"], correct: 1, explain: "CAP: you can pick CA, CP, or AP — not all three simultaneously in a distributed system under network partitions." },
      { id: "sd_l2_2", q: "Database read replicas are used primarily to:", opts: ["Reduce write latency","Scale read throughput and offload analytics from the primary","Replace the primary on failure","Store backups"], correct: 1, explain: "Read replicas handle read-heavy traffic; the primary handles writes. Common in MySQL/Postgres setups." },
      { id: "sd_l2_3", q: "What is the thundering herd problem in caching?", opts: ["Too many cache nodes competing","When a cache key expires and many requests simultaneously hit the database before it's repopulated","A network storm between servers","Load balancer failure"], correct: 1, explain: "Cache stampede/thundering herd — solved with cache locks, probabilistic expiry, or background refresh." },
      { id: "sd_l2_4", q: "Which consistency model guarantees every read sees the most recent write?", opts: ["Eventual consistency","Read-your-writes consistency","Strong (linearisable) consistency","Causal consistency"], correct: 2, explain: "Strong consistency is the strictest — all nodes agree on current state. Trades availability/performance." },
      { id: "sd_l2_5", q: "Database sharding means:", opts: ["Backing up the database","Splitting data horizontally across multiple database instances by a shard key","Vertical partitioning by column","Adding read replicas"], correct: 1, explain: "Sharding distributes rows across nodes (e.g. by user_id % N) — each shard holds a subset of rows." },
      { id: "sd_l2_6", q: "What is a rate limiter and which algorithm is widely used?", opts: ["Firewall that blocks IPs; CIDR block","Controls request rate per client; Token bucket or sliding window log are common","Caches responses per client; LRU","Routes requests; Round-robin"], correct: 1, explain: "Rate limiters prevent abuse. Token bucket (allows bursts) and sliding window log (precise) are industry standards." },
      { id: "sd_l2_7", q: "Which data store is best suited for session storage needing sub-millisecond reads?", opts: ["PostgreSQL","HDFS","Redis (in-memory key-value store)","Cassandra"], correct: 2, explain: "Redis stores data in RAM — O(1) GET/SET with microsecond latency, ideal for sessions and caches." },
      { id: "sd_l2_8", q: "What is a circuit breaker pattern in microservices?", opts: ["A network firewall rule","Automatically stops sending requests to a failing service, allowing it to recover, then retries","A database failover strategy","A deployment rollback technique"], correct: 1, explain: "Circuit breaker (Hystrix, Resilience4j) prevents cascading failures by failing fast when a downstream service degrades." },
      { id: "sd_l2_9", q: "In event-driven architecture, what is the role of Kafka?", opts: ["Object storage","Distributed log / pub-sub message broker — producers write events, consumers read at their own pace","SQL database","API gateway"], correct: 1, explain: "Kafka is a distributed, durable, high-throughput log — decouples producers and consumers, replay-able." },
      { id: "sd_l2_10", q: "What is the main advantage of microservices over a monolith?", opts: ["Easier to develop from scratch","Each service is independently deployable, scalable, and can use the best technology for its use case","Lower network overhead","Single codebase is simpler to manage"], correct: 1, explain: "Microservices enable independent scaling and deployment. Downsides: distributed system complexity, network overhead." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "sd_l3_1", q: "Design a URL shortener for 100M URLs/day. The storage layer should be:", opts: ["Single PostgreSQL node","Sharded PostgreSQL or Cassandra by short-code hash, with Redis for hot-key cache","HDFS with MapReduce","Single Redis instance"], correct: 1, explain: "Sharded DB handles scale; Redis caches the top 20% hot links (80% of reads) for O(1) lookups." },
      { id: "sd_l3_2", q: "For Twitter-like feed fanout with 500M users, the scalable approach is:", opts: ["Pull model only (user fetches all following's tweets at load time)","Hybrid: push to fanout queues for regular users, pull for celebrities (high-follower accounts)","Write to every follower's DB row synchronously","Use a monolith with a single DB"], correct: 1, explain: "Push fanout is fast to read but expensive for celebs (Katy Perry → 100M writes). Hybrid = push for ≤10K followers, pull for mega-accounts." },
      { id: "sd_l3_3", q: "You need globally consistent distributed transactions across two services. The pattern to use is:", opts: ["Two-Phase Commit (2PC) or SAGA with compensating transactions","Single DB transaction","REST with retry only","Event sourcing without saga"], correct: 0, explain: "2PC offers atomic commit but has coordinator SPOF. SAGA with compensating transactions is more resilient for microservices." },
      { id: "sd_l3_4", q: "A leaderboard needs real-time ranking of 10M users. The best data structure/store is:", opts: ["PostgreSQL ORDER BY score","Redis Sorted Sets (ZSET) with ZADD/ZRANK operations","Cassandra with wide rows","DynamoDB scan"], correct: 1, explain: "Redis ZSETs maintain score-ordered sets with O(log N) rank queries — purpose-built for leaderboards." },
      { id: "sd_l3_5", q: "To handle 1M concurrent WebSocket connections for a chat app, you would:", opts: ["Use a single Node.js server","Horizontally scale stateless gateway nodes behind a load balancer, use Redis pub-sub for cross-node message routing","Use polling instead","Use a monolithic Django app"], correct: 1, explain: "Stateless gateway + Redis pub-sub lets any node fan-out a message to the correct client — horizontal scale without session affinity issues." },
    ], submission_pool: [
      { id: "sd_l3_sub_1", prompt: "Pick one of: (a) Design Instagram, (b) Design a rate limiter, (c) Design a notification system. Write your high-level design in 200-300 words covering: components, data model, scalability choices, and one trade-off you'd make.", placeholder: "My HLD…" },
      { id: "sd_l3_sub_2", prompt: "Describe the architecture of the most complex backend system you've built or studied. What would you do differently at 100× scale? (~150 words)", placeholder: "My architecture + scale thoughts…" },
    ]},
  },
};

const dbms: SkillBank = {
  name: "DBMS",
  aliases: ["dbms", "database management", "database management systems", "rdbms"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "dbms_l1_1", q: "What does DBMS stand for?", opts: ["Data Backup Management System","Database Management System","Distributed Backend Management System","Data Block Memory Store"], correct: 1, explain: "DBMS = software that manages databases — create, read, update, delete, and enforce constraints." },
      { id: "dbms_l1_2", q: "Which SQL command retrieves data from a table?", opts: ["INSERT","UPDATE","SELECT","DELETE"], correct: 2, explain: "`SELECT column FROM table WHERE condition` retrieves rows." },
      { id: "dbms_l1_3", q: "What is a Primary Key?", opts: ["A key that allows NULL values","A foreign key reference","A column (or set of columns) that uniquely identifies each row in a table","An index on a non-unique column"], correct: 2, explain: "Primary keys must be unique and NOT NULL — they uniquely identify each record." },
      { id: "dbms_l1_4", q: "What is a Foreign Key?", opts: ["The first column of a table","A key that references the primary key of another table, establishing a relationship","An auto-incremented ID","An encrypted primary key"], correct: 1, explain: "Foreign keys enforce referential integrity between related tables." },
      { id: "dbms_l1_5", q: "First Normal Form (1NF) requires:", opts: ["No redundant data","All non-key attributes depend on the whole primary key","Each column contains atomic (indivisible) values and each row is unique","No transitive dependencies"], correct: 2, explain: "1NF: no repeating groups, atomic values, unique rows." },
      { id: "dbms_l1_6", q: "What does DDL stand for in SQL?", opts: ["Data Definition Language","Data Deletion Language","Dynamic Data Loading","Distributed Data Layer"], correct: 0, explain: "DDL commands (CREATE, ALTER, DROP) define and modify the database structure/schema." },
      { id: "dbms_l1_7", q: "Which clause filters rows AFTER a GROUP BY aggregation?", opts: ["WHERE","HAVING","ORDER BY","LIMIT"], correct: 1, explain: "WHERE filters before aggregation; HAVING filters the aggregated groups." },
      { id: "dbms_l1_8", q: "What is an Entity-Relationship (ER) diagram used for?", opts: ["Showing network topology","Modelling the logical structure of a database — entities, attributes, and relationships","Displaying query execution plans","Mapping server IP addresses"], correct: 1, explain: "ER diagrams are a conceptual design tool to model data before implementation." },
      { id: "dbms_l1_9", q: "Which SQL JOIN returns all rows from the left table and matching rows from the right?", opts: ["INNER JOIN","RIGHT JOIN","LEFT JOIN","FULL OUTER JOIN"], correct: 2, explain: "LEFT JOIN returns all left rows; right-side columns are NULL where no match exists." },
      { id: "dbms_l1_10", q: "What does the SQL `DISTINCT` keyword do?", opts: ["Sorts results","Returns only unique values in the result set","Filters NULL values","Creates an index"], correct: 1, explain: "`SELECT DISTINCT column` removes duplicate values from the output." },
      { id: "dbms_l1_11", q: "Which aggregate function returns the number of rows?", opts: ["SUM","AVG","COUNT","MAX"], correct: 2, explain: "`COUNT(*)` counts all rows; `COUNT(column)` counts non-NULL values." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "dbms_l2_1", q: "What is a transaction in DBMS?", opts: ["A SQL SELECT query","A unit of work that must be completed fully or not at all (ACID semantics)","A stored procedure","An index rebuild"], correct: 1, explain: "Transactions group operations atomically — either all succeed or all are rolled back." },
      { id: "dbms_l2_2", q: "What does ACID stand for?", opts: ["Atomicity, Consistency, Isolation, Durability","Availability, Consistency, Integrity, Distribution","Atomicity, Caching, Indexing, Durability","Access, Commit, Isolation, Deletion"], correct: 0, explain: "ACID = Atomicity (all-or-nothing), Consistency (valid state), Isolation (concurrent tx independence), Durability (committed writes survive crashes)." },
      { id: "dbms_l2_3", q: "What is the difference between DELETE and TRUNCATE in SQL?", opts: ["No difference","DELETE removes specific rows (with WHERE, logged, can rollback); TRUNCATE removes all rows fast and is not row-logged","TRUNCATE allows WHERE clause","DELETE is DDL, TRUNCATE is DML"], correct: 1, explain: "TRUNCATE is faster (no row-level logging) but non-transactional in some databases; DELETE is DML and fully rollback-able." },
      { id: "dbms_l2_4", q: "What is a deadlock in database transactions?", opts: ["A table with no indexes","Two or more transactions each waiting for the other to release a lock — circular wait causes all to stall","A failed INSERT","A slow query running over 30 seconds"], correct: 1, explain: "Deadlocks are resolved by the DBMS aborting one transaction (the victim) and rolling it back." },
      { id: "dbms_l2_5", q: "Third Normal Form (3NF) eliminates:", opts: ["Repeating groups","Partial dependencies","Transitive dependencies (non-key attributes depending on other non-key attributes)","Multi-valued attributes"], correct: 2, explain: "3NF requires every non-key attribute depends ONLY on the primary key — not on other non-key columns." },
      { id: "dbms_l2_6", q: "A B-Tree index is most effective for:", opts: ["Exact key lookups only","Range queries and sorted output (e.g. BETWEEN, ORDER BY, LIKE 'prefix%')","Full-text search","JSON document queries"], correct: 1, explain: "B-Tree indexes store keys in sorted order — efficient for range scans and equality lookups." },
      { id: "dbms_l2_7", q: "What is the purpose of the EXPLAIN command?", opts: ["Shows table structure","Displays the query execution plan so you can identify slow operations (seq scan, index use, join type)","Drops a table","Lists all users"], correct: 1, explain: "`EXPLAIN` (or `EXPLAIN ANALYZE`) shows how the DB engine will execute a query — identify missing indexes and inefficient joins." },
      { id: "dbms_l2_8", q: "Which isolation level prevents dirty reads but allows non-repeatable reads?", opts: ["Read Uncommitted","Read Committed","Repeatable Read","Serializable"], correct: 1, explain: "Read Committed prevents reading uncommitted data but allows another transaction to modify the row mid-transaction." },
      { id: "dbms_l2_9", q: "What is a view in SQL?", opts: ["A physical copy of a table","A virtual table defined by a SELECT query — no data is stored separately","A type of index","An auto-generated backup"], correct: 1, explain: "Views are named queries. Most views don't materialise data (except materialised views). Simplify complex queries and enforce security." },
      { id: "dbms_l2_10", q: "Which join type returns ALL rows from both tables, including non-matching ones (with NULLs where no match)?", opts: ["INNER JOIN","LEFT JOIN","RIGHT JOIN","FULL OUTER JOIN"], correct: 3, explain: "FULL OUTER JOIN returns the union of both tables — matched rows plus unmatched rows from each side filled with NULLs." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "dbms_l3_1", q: "A slow query is doing a sequential scan on a 10M-row table. The WHERE clause filters on `email`. Best fix:", opts: ["Add more RAM","Create a B-Tree index on `email`","Switch to NoSQL","Partition the table by date"], correct: 1, explain: "A B-Tree index on the filter column turns O(n) full scan into O(log n) index lookup." },
      { id: "dbms_l3_2", q: "You need to store hierarchical category data (trees). The best relational pattern for efficient subtree queries is:", opts: ["Adjacency list (parent_id column)","Nested Sets or Closure Table","JSON column","Multiple self-joins at query time"], correct: 1, explain: "Adjacency list is simple but requires recursive CTEs. Nested Sets or Closure Tables allow efficient subtree reads." },
      { id: "dbms_l3_3", q: "For an analytics workload querying billions of events by date range and category, the optimal storage approach is:", opts: ["Single OLTP PostgreSQL table with indexes","Columnar store (Redshift, BigQuery, ClickHouse) with partitioning by date","Redis cache","In-memory SQLite"], correct: 1, explain: "OLAP columnar stores compress and scan only queried columns — orders of magnitude faster for analytics than row-oriented OLTP DBs." },
      { id: "dbms_l3_4", q: "A banking system requires distributed transactions across an accounts table and a ledger table on different database shards. The safest approach is:", opts: ["Skip transaction across shards","Two-Phase Commit (2PC) managed by a coordinator, or SAGA with compensating transactions","Fire-and-forget async inserts","JSON file logging"], correct: 1, explain: "2PC guarantees atomicity across shards; SAGA provides eventual consistency with compensation — both handle cross-shard transactions." },
      { id: "dbms_l3_5", q: "Which strategy prevents phantom reads in a multi-user DBMS?", opts: ["Read Committed isolation","Optimistic locking only","Serializable isolation or MVCC with range locks (Predicate locking)","Disabling transactions"], correct: 2, explain: "Phantom reads = new rows inserted mid-transaction matching a query. Serializable isolation (or MVCC predicate locks) prevents this." },
    ], submission_pool: [
      { id: "dbms_l3_sub_1", prompt: "Write a SQL query to find the top 3 departments by average salary from tables `employees(id, name, salary, dept_id)` and `departments(id, name)`. Paste your query and explain your approach.", placeholder: "SQL query + explanation…" },
      { id: "dbms_l3_sub_2", prompt: "Design a database schema for an e-commerce order system. List your tables, primary keys, foreign keys, and which indexes you'd add. Explain one normalisation decision you made. (~150 words)", placeholder: "Schema design + explanation…" },
    ]},
  },
};

const networks: SkillBank = {
  name: "Computer Networks",
  aliases: ["networks", "networking", "cn", "computer network", "computer networking"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "cn_l1_1", q: "How many layers does the OSI model have?", opts: ["4","5","7","9"], correct: 2, explain: "OSI has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application." },
      { id: "cn_l1_2", q: "Which protocol is used to translate domain names to IP addresses?", opts: ["DHCP","ARP","DNS","SMTP"], correct: 2, explain: "DNS (Domain Name System) resolves human-readable hostnames (google.com) to IP addresses." },
      { id: "cn_l1_3", q: "What is an IP address?", opts: ["A unique name for a web page","A numerical label assigned to each device on a network for identification and routing","A type of encryption key","A MAC address alias"], correct: 1, explain: "IP addresses identify devices on a network (IPv4: 32-bit, IPv6: 128-bit)." },
      { id: "cn_l1_4", q: "Which transport layer protocol is connection-oriented and guarantees delivery?", opts: ["UDP","ICMP","TCP","ARP"], correct: 2, explain: "TCP (Transmission Control Protocol) uses 3-way handshake, sequence numbers, and acknowledgments to ensure reliable delivery." },
      { id: "cn_l1_5", q: "What does HTTP stand for?", opts: ["HyperText Transfer Protocol","High Traffic Transmission Protocol","Hybrid Text Transfer Protocol","HyperText Transaction Protocol"], correct: 0, explain: "HTTP is the foundation of data communication on the web — request/response protocol over TCP." },
      { id: "cn_l1_6", q: "What is the default port number for HTTPS?", opts: ["80","21","443","8080"], correct: 2, explain: "HTTPS (HTTP over TLS/SSL) runs on port 443. Plain HTTP uses port 80." },
      { id: "cn_l1_7", q: "What is a subnet mask used for?", opts: ["Encrypting data in transit","Identifying which portion of an IP address is the network vs. host part","Assigning MAC addresses","Routing between continents"], correct: 1, explain: "Subnet mask (e.g. 255.255.255.0) divides the IP into network and host portions for routing." },
      { id: "cn_l1_8", q: "What does a router do?", opts: ["Connects devices in the same LAN by MAC address","Forwards data packets between different networks based on IP addresses","Encrypts wireless signals","Assigns port numbers"], correct: 1, explain: "Routers operate at Layer 3 (Network), making routing decisions based on IP destination addresses." },
      { id: "cn_l1_9", q: "What is the difference between TCP and UDP?", opts: ["TCP is faster; UDP is more reliable","TCP provides reliable, ordered delivery; UDP is faster but connectionless and unreliable","UDP uses port numbers; TCP does not","No difference — both use the same handshake"], correct: 1, explain: "TCP = reliable, ordered, connection-oriented. UDP = low-overhead, no guarantee — used for video, DNS, gaming." },
      { id: "cn_l1_10", q: "Which protocol dynamically assigns IP addresses to devices on a network?", opts: ["DNS","ARP","NAT","DHCP"], correct: 3, explain: "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP, subnet mask, gateway, and DNS to clients." },
      { id: "cn_l1_11", q: "What is the MAC address used for?", opts: ["Routing between networks","Identifying a device within a local network (Layer 2 addressing)","Encrypting packets","Resolving domain names"], correct: 1, explain: "MAC (Media Access Control) addresses are hardware-level identifiers used for LAN communication (Ethernet, Wi-Fi)." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "cn_l2_1", q: "What is the TCP 3-way handshake sequence?", opts: ["SYN → ACK → FIN","SYN → SYN-ACK → ACK","ACK → SYN → FIN","SYN → FIN → ACK"], correct: 1, explain: "Client sends SYN, server replies SYN-ACK, client confirms with ACK — connection established." },
      { id: "cn_l2_2", q: "What does NAT (Network Address Translation) do?", opts: ["Encrypts all network traffic","Maps private IP addresses to a public IP, allowing multiple devices to share one public address","Assigns DNS records","Routes packets across ASes"], correct: 1, explain: "NAT allows home/office devices with private IPs (192.168.x.x) to share a single public IP address." },
      { id: "cn_l2_3", q: "What is a BGP (Border Gateway Protocol) used for?", opts: ["Assigning IP addresses on a LAN","Routing between autonomous systems (AS) on the global internet","Encrypting email","Load balancing within a data centre"], correct: 1, explain: "BGP is the 'postal service' of the internet — it routes traffic between ISPs and large networks (ASes)." },
      { id: "cn_l2_4", q: "What is a VLAN?", opts: ["Virtual Private Network","A virtual LAN that logically segments a physical network — isolates broadcast domains without separate hardware","Virtual Load Balancer Node","A type of wireless protocol"], correct: 1, explain: "VLANs segment a switch's ports logically — traffic is isolated per VLAN even on shared physical infrastructure." },
      { id: "cn_l2_5", q: "What does TLS provide in HTTPS connections?", opts: ["Faster data transfer","Encryption (confidentiality), authentication (server certificate), and data integrity","IP address hiding","Bandwidth compression"], correct: 1, explain: "TLS provides the security in HTTPS: encrypts data in transit, authenticates the server, and prevents tampering." },
      { id: "cn_l2_6", q: "What is the purpose of ARP (Address Resolution Protocol)?", opts: ["Resolves domain names to IPs","Resolves IP addresses to MAC addresses within a local network","Encrypts layer 2 frames","Routes packets between subnets"], correct: 1, explain: "ARP maps a known IP address to its MAC address — required for Layer 2 frame delivery within a LAN." },
      { id: "cn_l2_7", q: "TCP's congestion control algorithm Slow Start works by:", opts: ["Starting at maximum window size and reducing on loss","Beginning with a small congestion window that doubles each RTT until a threshold or loss is detected","Sending all data at a fixed rate","Disabling retransmission"], correct: 1, explain: "Slow Start grows the congestion window exponentially (doubles per RTT) to probe available bandwidth without flooding the network." },
      { id: "cn_l2_8", q: "What is a firewall?", opts: ["Hardware that speeds up network connections","A network security device that monitors and controls incoming/outgoing traffic based on rules","A DNS resolver","A physical router"], correct: 1, explain: "Firewalls filter traffic by IP, port, and protocol — stateless (packet filter) or stateful (connection-aware)." },
      { id: "cn_l2_9", q: "What is the difference between a hub and a switch?", opts: ["No functional difference","A hub broadcasts to all ports; a switch intelligently forwards frames only to the destination device's port","A switch is wireless; a hub is wired","A hub is Layer 3; a switch is Layer 2"], correct: 1, explain: "Switches maintain a MAC table and forward frames only to the correct port — much more efficient than hubs." },
      { id: "cn_l2_10", q: "What is a DNS TTL (Time To Live)?", opts: ["How long a TCP connection stays open","How long a DNS resolver caches a record before re-querying the authoritative server","Packet hop limit in routing","SSL certificate validity period"], correct: 1, explain: "Lower TTL = faster propagation of DNS changes but more queries. Higher TTL = fewer queries but slower updates." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "cn_l3_1", q: "A user reports intermittent HTTPS failures. Your first diagnostic steps on a Linux server are:", opts: ["Restart the server","Run curl -v, check SSL certificate expiry with openssl s_client, and use tcpdump to inspect the handshake","Delete and re-add DNS records","Switch to HTTP"], correct: 1, explain: "curl -v shows TLS errors; openssl s_client reveals cert issues; tcpdump captures the raw handshake for deep inspection." },
      { id: "cn_l3_2", q: "To defend against a DDoS volumetric attack (100 Gbps UDP flood), the most effective mitigation is:", opts: ["Increase server RAM","Upstream scrubbing via Anycast (Cloudflare, AWS Shield) — absorbs attack before it reaches your origin","Add a firewall rule blocking UDP","Deploy a second server"], correct: 1, explain: "Scrubbing centres absorb volumetric DDoS at the network edge. No single server-side rule stops 100 Gbps." },
      { id: "cn_l3_3", q: "You need zero-downtime DNS migration to a new server. The correct procedure is:", opts: ["Change the A record and wait","Lower TTL 48 hours before migration, update the A record, verify traffic shifts, then raise TTL","Disable DNS temporarily","Update only the MX record"], correct: 1, explain: "Lower TTL first so clients re-query quickly after the change — reduces propagation window and downtime." },
      { id: "cn_l3_4", q: "HTTP/2 improves over HTTP/1.1 primarily by:", opts: ["Using UDP instead of TCP","Multiplexing multiple requests over a single TCP connection, eliminating head-of-line blocking and supporting header compression (HPACK)","Removing TLS requirement","Using longer TTLs"], correct: 1, explain: "HTTP/2 multiplexing, server push, and HPACK compression significantly reduce page load times vs HTTP/1.1." },
      { id: "cn_l3_5", q: "Which protocol does WebRTC use for media transport and why?", opts: ["TCP, for reliability","UDP with SRTP (Secure RTP) — because low latency matters more than perfect delivery for real-time audio/video","QUIC only","HTTP streaming"], correct: 1, explain: "UDP's lower latency is critical for real-time video/audio. Dropped frames are tolerated; stalls from TCP retransmits are not." },
    ], submission_pool: [
      { id: "cn_l3_sub_1", prompt: "Trace the complete journey of a request from typing 'https://github.com' in your browser to receiving the HTML. Include: DNS resolution, TCP/TLS handshake, HTTP request, and response. (~200 words)", placeholder: "Step-by-step trace…" },
      { id: "cn_l3_sub_2", prompt: "Describe how you'd design the network architecture for a microservices deployment on AWS: subnets, security groups, load balancers, and how traffic flows from the internet to a private database. (~150 words)", placeholder: "My network design…" },
    ]},
  },
};

const digitalElectronics: SkillBank = {
  name: "Digital Electronics",
  aliases: ["digital electronics", "digital logic", "de", "digital circuits", "logic design", "ece core"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "de_l1_1", q: "Which logic gate outputs 1 only when ALL inputs are 1?", opts: ["OR","AND","NAND","NOR"], correct: 1, explain: "AND gate: output is HIGH only when every input is HIGH. Truth table: 0+0=0, 0+1=0, 1+0=0, 1+1=1." },
      { id: "de_l1_2", q: "What is the Boolean expression for a NAND gate with inputs A and B?", opts: ["A·B","A+B","(A·B)\'","(A+B)\'"], correct: 2, explain: "NAND = NOT AND. Output = (A·B)\'. It is 0 only when both A=1 AND B=1." },
      { id: "de_l1_3", q: "Which number system uses only 0 and 1?", opts: ["Octal","Decimal","Binary","Hexadecimal"], correct: 2, explain: "Binary (base-2) is the foundation of digital systems — only two digits, 0 and 1." },
      { id: "de_l1_4", q: "What is the decimal equivalent of the binary number 1010?", opts: ["8","10","12","14"], correct: 1, explain: "1010 in binary = 1×2³ + 0×2² + 1×2¹ + 0×2⁰ = 8+0+2+0 = 10." },
      { id: "de_l1_5", q: "Which gate is known as the 'universal gate' because it can implement any other gate?", opts: ["AND","OR","NAND","XOR"], correct: 2, explain: "NAND (and NOR) are universal gates — any Boolean function can be built using only NAND gates." },
      { id: "de_l1_6", q: "What does a multiplexer (MUX) do?", opts: ["Converts analog to digital","Selects one of many inputs and routes it to a single output based on select lines","Stores binary data","Generates clock signals"], correct: 1, explain: "A MUX is a data selector — 2ⁿ inputs, n select lines, 1 output. Used extensively in digital design." },
      { id: "de_l1_7", q: "What is the complement of binary 1101?", opts: ["0010","0011","1110","0100"], correct: 0, explain: "1's complement: flip every bit. 1101 → 0010." },
      { id: "de_l1_8", q: "Which flip-flop is also called a 'data' or 'delay' flip-flop?", opts: ["JK","SR","D","T"], correct: 2, explain: "D flip-flop (Data/Delay): output Q follows input D on the clock edge. Eliminates the indeterminate state of SR." },
      { id: "de_l1_9", q: "How many bits does a hexadecimal digit represent?", opts: ["2","3","4","8"], correct: 2, explain: "Hexadecimal (base-16) uses 4 bits per digit. F = 1111, A = 1010, etc." },
      { id: "de_l1_10", q: "What is the output of XOR gate when both inputs are the same?", opts: ["1","0","Undefined","Depends on voltage"], correct: 1, explain: "XOR outputs 1 when inputs DIFFER, 0 when they are the same. 0⊕0=0, 1⊕1=0." },
      { id: "de_l1_11", q: "Convert hexadecimal 2F to decimal.", opts: ["45","47","41","43"], correct: 1, explain: "2F hex = 2×16 + 15 = 32+15 = 47 decimal." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "de_l2_1", q: "A Karnaugh map (K-map) is used to:", opts: ["Design flip-flops","Minimize Boolean expressions by grouping adjacent 1s","Convert decimal to binary","Generate clock waveforms"], correct: 1, explain: "K-maps provide a visual method to simplify SOP/POS Boolean expressions, reducing gates needed." },
      { id: "de_l2_2", q: "What is the 2's complement of 0110 (4-bit)?", opts: ["1001","1010","1100","0110"], correct: 1, explain: "2's complement: flip bits (0110→1001) then add 1 → 1010. Used for signed binary arithmetic." },
      { id: "de_l2_3", q: "An SR latch with S=1, R=0 will have output Q =", opts: ["0","1","Indeterminate","Unchanged"], correct: 1, explain: "S=1, R=0 → Set state → Q=1. S=0,R=1 → Reset Q=0. S=R=1 is the forbidden state." },
      { id: "de_l2_4", q: "How many select lines does an 8-to-1 MUX require?", opts: ["2","3","4","8"], correct: 1, explain: "An 8-to-1 MUX needs 3 select lines (2³=8 possible inputs)." },
      { id: "de_l2_5", q: "A half adder produces two outputs: Sum and Carry. What logic gate computes the Sum bit?", opts: ["AND","OR","XOR","XNOR"], correct: 2, explain: "Sum = A⊕B (XOR). Carry = A·B (AND). A full adder adds a carry-in bit as well." },
      { id: "de_l2_6", q: "What is the main difference between a latch and a flip-flop?", opts: ["Latches store 2 bits; flip-flops 1 bit","Latches are level-triggered; flip-flops are edge-triggered","Flip-flops are slower","No functional difference"], correct: 1, explain: "Latches are transparent when clock is high (level-triggered). Flip-flops respond only on a rising or falling clock edge." },
      { id: "de_l2_7", q: "A 3-to-8 decoder has 3 inputs and 8 outputs. How many outputs are active at once?", opts: ["3","8","1","2"], correct: 2, explain: "Decoders assert exactly ONE output high at a time corresponding to the binary input code." },
      { id: "de_l2_8", q: "Which Boolean identity is De Morgan's first theorem?", opts: ["(A+B)\'=A\'·B\'","(A·B)\'=A\'+B\'","A+A\'=1","A·(B+C)=A·B+A·C"], correct: 1, explain: "De Morgan's 1st: (A·B)\'=A\'+B\'. De Morgan's 2nd: (A+B)\'=A\'·B\'. NAND/NOR gate equivalents." },
      { id: "de_l2_9", q: "What type of counter counts from 0 up to 2ⁿ−1 and then resets, with each flip-flop driven by the previous stage's output?", opts: ["Synchronous counter","Ring counter","Ripple (asynchronous) counter","Johnson counter"], correct: 2, explain: "Ripple counters chain flip-flops — each stage clocked by previous Q. Simple but accumulates propagation delay." },
      { id: "de_l2_10", q: "What is the propagation delay in a digital circuit?", opts: ["Power consumed per gate","Time taken for a change in input to produce a change in output","Clock frequency","Voltage threshold"], correct: 1, explain: "Propagation delay (tpd) determines maximum operating frequency — total delay through a combinational path must be < clock period." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "de_l3_1", q: "To implement F = ΣM(0,1,3,7) using a K-map, the minimal SOP expression is:", opts: ["A\'B\'C\' + A\'B\'C + A\'BC + ABC","A\'B\' + BC","A\'C\' + BC","A\'B\'+ AB"], correct: 2, explain: "Group the four 1s: {0,1} = A\'B\', {3,7} = BC → F = A\'B\' + BC." },
      { id: "de_l3_2", q: "In a 4-bit ripple carry adder adding two 4-bit numbers, the worst-case propagation delay is:", opts: ["1 gate delay","4 gate delays","Depends only on input values","2 gate delays"], correct: 1, explain: "Carry ripples through all 4 stages — worst case is 4× the per-stage delay. Carry lookahead adders solve this." },
      { id: "de_l3_3", q: "A synchronous counter needs a state diagram for states 0–5 (mod-6). The unused states (6,7) should be:", opts: ["Left as don't-cares to save gates","Steered back to a valid state to prevent lock-up","Always 0","Always 1"], correct: 1, explain: "Unused states must transition to a valid state. Otherwise a power glitch can lock the counter in an invalid state." },
      { id: "de_l3_4", q: "An ADC with 10-bit resolution and full-scale range 5V has a resolution of:", opts: ["4.88 mV","10 mV","5 mV","1 mV"], correct: 0, explain: "Resolution = V_FS / (2ⁿ−1) = 5V / 1023 ≈ 4.88 mV per LSB." },
      { id: "de_l3_5", q: "Setup time violation in a flip-flop causes:", opts: ["Increased power consumption","Metastability — output may oscillate or settle to wrong value unpredictably","Decreased propagation delay","Flip-flop to reset to 0"], correct: 1, explain: "If data changes within the setup window, the flip-flop enters metastability — it may neither resolve to 0 nor 1 quickly enough." },
    ], submission_pool: [
      { id: "de_l3_sub_1", prompt: "Design a 3-bit synchronous up-counter using JK flip-flops. Show the state table, derive the J and K input equations using K-maps, and draw the resulting circuit. (~200 words + truth table)", placeholder: "State table and K-map derivation…" },
      { id: "de_l3_sub_2", prompt: "Explain the difference between a ripple carry adder and a carry lookahead adder in terms of propagation delay and hardware cost. When would you choose each? (~150 words)", placeholder: "Comparison…" },
    ]},
  },
};

const statistics: SkillBank = {
  name: "Statistics & Probability",
  aliases: ["statistics", "probability", "stats", "statistics and probability", "statistical analysis", "data analysis", "mathematics"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "st_l1_1", q: "What is the mean of the data set {2, 4, 6, 8, 10}?", opts: ["5","6","7","8"], correct: 1, explain: "Mean = (2+4+6+8+10)/5 = 30/5 = 6." },
      { id: "st_l1_2", q: "The probability of an event cannot be:", opts: ["0","0.5","1","2"], correct: 3, explain: "Probability must satisfy 0 ≤ P(E) ≤ 1. A value of 2 is impossible." },
      { id: "st_l1_3", q: "The median of {3, 1, 4, 1, 5, 9, 2, 6} is:", opts: ["3","3.5","4","4.5"], correct: 1, explain: "Sorted: 1,1,2,3,4,5,6,9. Median = (3+4)/2 = 3.5." },
      { id: "st_l1_4", q: "Which measure of central tendency is most affected by extreme outliers?", opts: ["Median","Mode","Mean","Range"], correct: 2, explain: "The mean sums all values, so a very large or small outlier shifts it significantly. Median is resistant to outliers." },
      { id: "st_l1_5", q: "If P(A) = 0.4 and P(B) = 0.3 and A and B are mutually exclusive, what is P(A∪B)?", opts: ["0.12","0.58","0.7","0.3"], correct: 2, explain: "Mutually exclusive: P(A∪B) = P(A)+P(B) = 0.4+0.3 = 0.7. No intersection (P(A∩B)=0)." },
      { id: "st_l1_6", q: "Standard deviation measures:", opts: ["The most frequent value","How spread out data is from the mean","The sum of all values","The middle value"], correct: 1, explain: "Standard deviation (σ or s) quantifies dispersion — low σ means data clusters around the mean; high σ means spread out." },
      { id: "st_l1_7", q: "A fair die is rolled. What is the probability of getting an even number?", opts: ["1/6","1/3","1/2","2/3"], correct: 2, explain: "Even outcomes: {2,4,6} → 3 out of 6 = 1/2." },
      { id: "st_l1_8", q: "What does a correlation coefficient of −1 indicate?", opts: ["No relationship","Perfect positive linear relationship","Perfect negative linear relationship","Non-linear relationship"], correct: 2, explain: "r = −1: perfect negative linear correlation — as one variable increases, the other decreases proportionally." },
      { id: "st_l1_9", q: "Which chart is most appropriate for showing the distribution of a continuous variable?", opts: ["Pie chart","Bar chart","Histogram","Line chart"], correct: 2, explain: "Histograms show frequency distribution of continuous data by dividing it into bins." },
      { id: "st_l1_10", q: "What is the mode of {5, 3, 7, 3, 5, 3, 9}?", opts: ["3","5","7","9"], correct: 0, explain: "Mode = most frequently occurring value. 3 appears 3 times; 5 appears 2 times → mode = 3." },
      { id: "st_l1_11", q: "In a normal distribution, what percentage of data falls within 1 standard deviation of the mean?", opts: ["50%","68%","95%","99.7%"], correct: 1, explain: "Empirical rule: ≈68% within ±1σ, ≈95% within ±2σ, ≈99.7% within ±3σ." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "st_l2_1", q: "Bayes' theorem is used to:", opts: ["Calculate standard deviation","Update the probability of a hypothesis given new evidence","Find the mean of grouped data","Calculate variance"], correct: 1, explain: "Bayes' theorem: P(A|B) = P(B|A)·P(A)/P(B). It lets us revise probabilities when new data arrives." },
      { id: "st_l2_2", q: "The Central Limit Theorem states that the sampling distribution of the mean approaches a normal distribution as:", opts: ["Data becomes skewed","Sample size increases","Variance decreases","Population size decreases"], correct: 1, explain: "CLT: regardless of population distribution, the sample mean distribution becomes normal as n→∞ (practically n>30)." },
      { id: "st_l2_3", q: "A Type I error is:", opts: ["Failing to reject a false null hypothesis","Rejecting a true null hypothesis","Accepting the alternative hypothesis correctly","A calculation mistake"], correct: 1, explain: "Type I (α): false positive — rejecting H₀ when it's actually true. Controlled by significance level α (usually 0.05)." },
      { id: "st_l2_4", q: "The p-value represents:", opts: ["Probability that the alternative hypothesis is true","Probability of observing results as extreme or more extreme, given H₀ is true","The sample mean","The variance"], correct: 1, explain: "p-value < α → reject H₀. It does NOT mean 'probability H₀ is false' — it's the probability of data given H₀ is true." },
      { id: "st_l2_5", q: "In a Poisson distribution, what are the mean and variance equal to?", opts: ["μ and σ²","Both equal λ (lambda)","μ and μ²","0 and 1"], correct: 1, explain: "Poisson: mean = variance = λ. Used for rare events over time/space (calls/hour, defects/unit)." },
      { id: "st_l2_6", q: "The coefficient of variation (CV) is useful because:", opts: ["It is always between 0 and 1","It allows comparison of spread across datasets with different units or means","It replaces standard deviation","It removes outliers"], correct: 1, explain: "CV = (σ/μ)×100%. Allows comparing relative variability regardless of scale — e.g. comparing stock volatility." },
      { id: "st_l2_7", q: "Linear regression finds the 'line of best fit' by minimizing:", opts: ["The sum of residuals","The sum of squared residuals (Ordinary Least Squares)","The median residual","The largest residual"], correct: 1, explain: "OLS minimizes Σ(yᵢ − ŷᵢ)². This gives unique, unbiased coefficient estimates." },
      { id: "st_l2_8", q: "What does R² (coefficient of determination) measure?", opts: ["Slope of the regression line","Proportion of variance in Y explained by the model","Correlation between X and Y²","Standard error of the estimate"], correct: 1, explain: "R² = 1 − (SS_res/SS_tot). R²=0.8 means 80% of variance in Y is explained by the predictors." },
      { id: "st_l2_9", q: "Stratified random sampling is preferred when:", opts: ["The population is completely homogeneous","The population has distinct subgroups (strata) and you want each represented","Random sampling is too expensive","Sample size is very large"], correct: 1, explain: "Stratified sampling divides population into strata, samples proportionally from each — reduces sampling error for heterogeneous populations." },
      { id: "st_l2_10", q: "Which non-parametric test is the equivalent of the independent samples t-test?", opts: ["Chi-square test","Mann-Whitney U test","Kruskal-Wallis test","Spearman rank test"], correct: 1, explain: "Mann-Whitney U (Wilcoxon rank-sum): compares medians of two independent groups without assuming normality." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "st_l3_1", q: "A company runs an A/B test: 1000 users each group, conversion rates 5.2% vs 4.6%. What is the FIRST step to determine statistical significance?", opts: ["Conclude B is better since 5.2%>4.6%","Perform a two-proportion z-test or chi-square test to compute p-value","Increase sample size without testing","Use a t-test on the raw rates"], correct: 1, explain: "Two-proportion z-test (or chi-square): tests if the observed difference 0.6% is beyond random variation. Only then conclude significance." },
      { id: "st_l3_2", q: "In multiple linear regression, multicollinearity refers to:", opts: ["High R² value","High correlation between two or more independent variables, inflating standard errors","Heteroscedasticity in residuals","Non-linear relationship between X and Y"], correct: 1, explain: "Multicollinearity makes it hard to isolate individual predictor effects. Detected via VIF (Variance Inflation Factor). Remedies: drop correlated predictors, PCA." },
      { id: "st_l3_3", q: "An analyst observes that residuals increase as fitted values increase. This violates which OLS assumption?", opts: ["Independence","Normality","Homoscedasticity","Linearity"], correct: 2, explain: "Heteroscedasticity: non-constant variance of residuals. Fix: transform the response (log Y), use WLS, or robust standard errors." },
      { id: "st_l3_4", q: "The confusion matrix shows: TP=90, FP=10, FN=20, TN=80. What is the F1-score?", opts: ["0.80","0.857","0.818","0.90"], correct: 2, explain: "Precision=90/(90+10)=0.9. Recall=90/(90+20)≈0.818. F1=2×(0.9×0.818)/(0.9+0.818)≈0.857. Wait — F1=2TP/(2TP+FP+FN)=180/220≈0.818." },
      { id: "st_l3_5", q: "In Bayesian A/B testing vs frequentist, a key advantage of the Bayesian approach is:", opts: ["Simpler mathematics","Ability to compute 'probability that A is better than B' directly and stop early with controlled decision risk","It doesn't require a prior","Always finds statistical significance faster"], correct: 1, explain: "Bayesian A/B: P(A>B) is directly interpretable. No p-value threshold — can monitor continuously with lower false-positive risk using proper stopping rules." },
    ], submission_pool: [
      { id: "st_l3_sub_1", prompt: "You're analyzing a dataset of customer purchase amounts that is heavily right-skewed (mean ₹500, median ₹200). You want to build a regression model to predict purchases. Describe your full data preparation and modelling strategy, including transformations, model choice, and evaluation metrics. (~200 words)", placeholder: "Strategy…" },
      { id: "st_l3_sub_2", prompt: "Design an A/B test to evaluate a new checkout flow on an e-commerce app. Include: hypothesis, metric selection, sample size calculation approach, significance level, and how you'd handle multiple testing if you test 5 variants. (~150 words)", placeholder: "A/B test design…" },
    ]},
  },
};

const marketing: SkillBank = {
  name: "Marketing Fundamentals",
  aliases: ["marketing", "marketing fundamentals", "digital marketing", "marketing basics", "business marketing", "mba marketing", "bba marketing"],
  levels: {
    1: { time_sec: 720, pass_pct: 60, credits: 0.5, mcq_count: 10, pool: [
      { id: "mkt_l1_1", q: "The '4 Ps' of marketing are:", opts: ["Product, Price, Place, Promotion","People, Process, Physical Evidence, Profit","Planning, Positioning, Pricing, Profit","Product, Placement, Promotion, Profit"], correct: 0, explain: "The marketing mix (4 Ps): Product (what you sell), Price (what you charge), Place (distribution), Promotion (communication)." },
      { id: "mkt_l1_2", q: "Market segmentation divides customers by:", opts: ["Only age and gender","Demographic, geographic, psychographic, and behavioural characteristics","Company size only","Product category only"], correct: 1, explain: "Segmentation groups customers with similar needs so you can tailor your marketing mix — 4 main types: demographic, geographic, psychographic, behavioural." },
      { id: "mkt_l1_3", q: "What does 'brand equity' refer to?", opts: ["A company's total revenue","The commercial value derived from consumer perception of the brand name","The cost of manufacturing the product","The company's share price"], correct: 1, explain: "Brand equity is the premium a brand commands over a generic equivalent. Built through awareness, loyalty, quality associations (Keller's model)." },
      { id: "mkt_l1_4", q: "SEO stands for:", opts: ["Sales and Engagement Operations","Search Engine Optimization","Social Engagement Outreach","Standardised Email Output"], correct: 1, explain: "SEO improves organic (unpaid) search ranking by optimising content, structure, and backlinks to increase visibility." },
      { id: "mkt_l1_5", q: "Which metric measures the percentage of email recipients who clicked a link?", opts: ["Open rate","Click-through rate (CTR)","Bounce rate","Conversion rate"], correct: 1, explain: "CTR = (Clicks / Emails Delivered) × 100. It measures email engagement beyond opens." },
      { id: "mkt_l1_6", q: "A USP (Unique Selling Proposition) is:", opts: ["A government regulation on advertising","What makes your product different and better than competitors, stated clearly","Your pricing strategy","Your social media bio"], correct: 1, explain: "USP answers: 'Why should I buy from you instead of your competitor?' Examples: Domino's '30 mins or free', M&Ms 'melts in your mouth, not in your hands'." },
      { id: "mkt_l1_7", q: "Which stage in the marketing funnel describes when a customer considers purchasing?", opts: ["Awareness","Interest","Consideration","Retention"], correct: 2, explain: "AIDA funnel: Awareness → Interest → Desire (Consideration) → Action. At Consideration, customers evaluate options." },
      { id: "mkt_l1_8", q: "ROI in marketing is calculated as:", opts: ["(Revenue − Cost) / Cost × 100","Cost / Revenue × 100","Revenue / Impressions","Clicks / Spend"], correct: 0, explain: "Marketing ROI = ((Revenue from campaign − Cost) / Cost) × 100. Tells you how much return each ₹ spent generated." },
      { id: "mkt_l1_9", q: "Influencer marketing primarily leverages:", opts: ["Television advertising","The trust and audience of content creators to promote products","Cold email campaigns","Billboard advertising"], correct: 1, explain: "Influencer marketing uses creators' existing trust with their audience to promote products more authentically than traditional ads." },
      { id: "mkt_l1_10", q: "Which pricing strategy sets a high initial price, then lowers it over time?", opts: ["Penetration pricing","Economy pricing","Price skimming","Bundle pricing"], correct: 2, explain: "Price skimming: launch high (capture early adopters' willingness to pay), then reduce to attract price-sensitive customers. Used for electronics, software." },
    ]},
    2: { time_sec: 1200, pass_pct: 65, credits: 1.0, mcq_count: 10, pool: [
      { id: "mkt_l2_1", q: "Customer Lifetime Value (CLV) is important because:", opts: ["It replaces Net Promoter Score","It estimates total revenue a customer generates, helping justify acquisition cost","It tracks daily website visits","It predicts stock price"], correct: 1, explain: "CLV = (Average Order Value × Purchase Frequency × Customer Lifespan). If CLV > CAC, growth is sustainable." },
      { id: "mkt_l2_2", q: "In the BCG Matrix, a 'Cash Cow' is:", opts: ["High market share, high growth","Low market share, high growth","High market share, low market growth","Low market share, low growth"], correct: 2, explain: "Cash Cows generate high cash flow with little investment (mature market). That cash funds Stars and Question Marks." },
      { id: "mkt_l2_3", q: "Porter's Five Forces analyses competitive intensity through:", opts: ["4 Ps and 3 Cs","Supplier power, buyer power, threat of new entrants, threat of substitutes, rivalry among competitors","SWOT factors","Brand equity dimensions"], correct: 1, explain: "Porter's Five Forces determines industry attractiveness and competitive strategy. All five forces collectively determine profit potential." },
      { id: "mkt_l2_4", q: "A/B testing in digital marketing is used to:", opts: ["Compare company A vs company B sales","Test two versions of content/ad/landing page to determine which performs better","Run two campaigns simultaneously with different budgets","Compare offline vs online marketing"], correct: 1, explain: "A/B testing isolates one variable (subject line, CTA, image) between two groups to determine what improves conversion rates." },
      { id: "mkt_l2_5", q: "Net Promoter Score (NPS) is calculated from responses to:", opts: ["'How often do you purchase?'","'On a scale of 0–10, how likely are you to recommend us?'","'Rate our product quality 1–5'","'Did you complete your purchase?'"], correct: 1, explain: "NPS = % Promoters (9–10) − % Detractors (0–6). Passives (7–8) are excluded. Measures customer loyalty and word-of-mouth potential." },
      { id: "mkt_l2_6", q: "Content marketing's primary goal is to:", opts: ["Interrupt customers with ads","Attract and retain customers by creating valuable, relevant content that solves their problems","Increase TV ad spend","Eliminate the sales team"], correct: 1, explain: "Content marketing builds trust, SEO ranking, and long-term lead generation by educating customers rather than hard-selling." },
      { id: "mkt_l2_7", q: "Which digital advertising model charges per 1000 impressions?", opts: ["CPC (Cost per Click)","CPL (Cost per Lead)","CPM (Cost per Mille)","CPA (Cost per Acquisition)"], correct: 2, explain: "CPM = Cost per thousand impressions. Good for brand awareness. CPC charges per click — better for direct response campaigns." },
      { id: "mkt_l2_8", q: "The 'STP' marketing framework stands for:", opts: ["Sales, Targeting, Positioning","Segmentation, Targeting, Positioning","Strategy, Targeting, Planning","Segmentation, Testing, Profiling"], correct: 1, explain: "STP: (1) Segment the market, (2) Target the best segment(s), (3) Position your product for that segment's needs and perceptions." },
      { id: "mkt_l2_9", q: "Retargeting ads work by:", opts: ["Showing ads to everyone","Re-engaging users who previously visited your site or app but didn't convert","Only advertising on social media","Targeting new markets only"], correct: 1, explain: "Retargeting uses cookies/pixels to serve ads to past visitors, significantly improving conversion rates (warm audience)." },
      { id: "mkt_l2_10", q: "The conversion rate is calculated as:", opts: ["Impressions / Clicks","(Conversions / Total Visitors) × 100","Revenue / Users","Ad Spend / Revenue"], correct: 1, explain: "Conversion rate = (# who completed desired action / # total visitors) × 100. Benchmark varies: e-commerce ~2–3%, landing pages 5–15%." },
    ]},
    3: { time_sec: 2100, pass_pct: 70, credits: 1.5, mcq_count: 5, pool: [
      { id: "mkt_l3_1", q: "A D2C brand has CAC ₹800 and CLV ₹3200. The LTV:CAC ratio is 4:1. This means:", opts: ["The business is unprofitable","The ratio is healthy — every ₹1 spent acquiring a customer returns ₹4 in lifetime value","The business should stop marketing","The ratio is too low for scaling"], correct: 1, explain: "LTV:CAC ratio >3:1 is generally healthy for sustainable growth. Below 1:1 means you lose money on every customer." },
      { id: "mkt_l3_2", q: "You're allocating a ₹5L digital marketing budget. Meta Ads convert at 3%, Google Search at 8%, and organic SEO at 0.5%. The BEST allocation strategy is:", opts: ["Split 33/33/33 equally","Invest heaviest in the channel with the lowest CPA — calculate and optimise by CPA, not just conversion rate","Put everything into Google","Put everything into Meta"], correct: 1, explain: "Allocate by CPA (Cost per Acquisition), not just conversion rate. Factor in click cost, average order value, and scalability of each channel." },
      { id: "mkt_l3_3", q: "A FMCG brand's product is in the 'Dog' quadrant of the BCG matrix (low share, low growth). The recommended strategic action is:", opts: ["Increase marketing investment heavily","Harvest cash flow or divest — invest freed resources into Stars or Question Marks","Reposition as a premium product","Expand to new markets aggressively"], correct: 1, explain: "Dogs offer little growth and require cash. Harvest (minimal investment, milk cash) or divest. Don't pour resources into a shrinking market." },
      { id: "mkt_l3_4", q: "Omnichannel marketing differs from multichannel marketing in that:", opts: ["Omnichannel uses only digital channels","Omnichannel creates a seamless, integrated customer experience across all touchpoints with shared data and context","Multichannel is always more effective","Omnichannel requires fewer channels"], correct: 1, explain: "Multichannel = present on many channels. Omnichannel = those channels are integrated — customer history, preferences, and context are shared across all." },
      { id: "mkt_l3_5", q: "A brand with high awareness but low conversion has a problem primarily at which funnel stage?", opts: ["Awareness","Consideration or Decision — the brand isn't making a compelling case to convert interested customers","Retention","Advocacy"], correct: 1, explain: "High awareness means top-of-funnel is working. Low conversion points to middle/bottom-of-funnel issues: USP clarity, trust signals, pricing, UX, or social proof." },
    ], submission_pool: [
      { id: "mkt_l3_sub_1", prompt: "You're the growth lead for a new EdTech startup in India targeting college students. Your monthly budget is ₹1.5L. Define your STP strategy, select 2–3 channels with rationale, and describe how you'd measure success with specific KPIs. (~200 words)", placeholder: "Growth strategy…" },
      { id: "mkt_l3_sub_2", prompt: "A D2C skincare brand has 100k Instagram followers, ₹50L annual revenue, 2.1% website conversion rate, and 45% returning customers. Identify 2 key opportunities and propose a concrete 90-day marketing plan with channels, budget allocation (₹5L budget), and expected outcomes. (~200 words)", placeholder: "Marketing plan…" },
    ]},
  },
};

export const QUESTION_BANK: Record<string, SkillBank> = {
  [dsa.name.toLowerCase()]: dsa,
  [python.name.toLowerCase()]: python,
  [sql.name.toLowerCase()]: sql,
  [aptitude.name.toLowerCase()]: aptitude,
  [oops.name.toLowerCase()]: oops,
  [os.name.toLowerCase()]: os,
  [reactjs.name.toLowerCase()]: reactjs,
  [ml.name.toLowerCase()]: ml,
  [systemDesign.name.toLowerCase()]: systemDesign,
  [dbms.name.toLowerCase()]: dbms,
  [networks.name.toLowerCase()]: networks,
  [digitalElectronics.name.toLowerCase()]: digitalElectronics,
  [statistics.name.toLowerCase()]: statistics,
  [marketing.name.toLowerCase()]: marketing,
};

export function findBank(skill: string): SkillBank | null {
  if (!skill) return null;
  const key = skill.toLowerCase().trim();
  if (QUESTION_BANK[key]) return QUESTION_BANK[key];
  for (const bank of Object.values(QUESTION_BANK)) {
    if (bank.aliases?.some(a => key.includes(a) || a.includes(key))) return bank;
    if (bank.name.toLowerCase().includes(key) || key.includes(bank.name.toLowerCase())) return bank;
  }
  return null;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
