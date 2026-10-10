/* ============================================================
   ESCAPE THE VIVA - Subject Configuration
   ------------------------------------------------------------
   ONE place to control the subjects shown on the home screen,
   which question topics each subject pulls from, and which PDF
   note file each subject opens in "View Notes".

   To ADD A NEW SUBJECT:
     1. Add an entry below.
     2. `topics` must match the `topic:` values used in questions.js
        (currently: OOP, Java, DSA, DBMS, OS, CN, CS, Math,
         CD, CNS, SPPM, CC — in questions-sem7.js;
         DAA, CN_III, DEVOPS, PPL, NLP, ML, FLAT, AI, IOT — in questions-year3.js).
     II Year (R25): DM, COA, OOPJ, SE, DBMS_II, COSM, OS_II, ADA, CN_II,
     ML_II — in questions-year2.js.
     4. `sem` = year-semester printed on the syllabus (e.g. 'III-I').
        The same subject in different years gets its own entry and
        topic code (e.g. CN_III), because the syllabus differs.
     3. Drop a PDF at the `pdf` path (see /notes/README.txt).
   ============================================================ */

const SUBJECTS = [
  { id:'DSA',  name:'Data Structures & Algorithms', short:'DSA',  icon:'🌳', accent:'#4f9dff',
    topics:['DSA'],  pdf:'notes/dsa.pdf',  blurb:'Trees, graphs, sorting, complexity' },

  { id:'DBMS', name:'Database Management',           short:'DBMS', icon:'🗄️', accent:'#ffb020',
    topics:['DBMS'], pdf:'notes/dbms.pdf', blurb:'SQL, normalization, ACID, indexing' },

  { id:'OS',   name:'Operating Systems',             short:'OS',   icon:'🖥️', accent:'#2ecc71',
    topics:['OS'],   pdf:'notes/os.pdf',   blurb:'Processes, memory, scheduling, deadlocks' },

  { id:'CN',   name:'Computer Networks',             short:'CN',   icon:'🌐', accent:'#9b59b6',
    topics:['CN'],   pdf:'notes/cn.pdf',   blurb:'OSI/TCP-IP, routing, protocols' },

  { id:'OOP',  name:'Object-Oriented Programming',   short:'OOP',  icon:'🧩', accent:'#ff6b6b',
    topics:['OOP'],  pdf:'notes/oop.pdf',  blurb:'Classes, inheritance, polymorphism' },

  { id:'JAVA', name:'Java',                           short:'Java', icon:'☕', accent:'#e67e22',
    topics:['Java'], pdf:'notes/java.pdf', blurb:'JVM, collections, exceptions' },

  { id:'CS',   name:'CS Fundamentals',               short:'CS',   icon:'💡', accent:'#00c2d1',
    topics:['CS'],   pdf:'notes/cs.pdf',   blurb:'Core computer science concepts' },

  { id:'MATH', name:'Math & Aptitude',               short:'Math', icon:'📐', accent:'#f368e0',
    topics:['Math'], pdf:'notes/math.pdf', blurb:'Discrete math, logic, aptitude' },

  /* ---- B.Tech IV Year I Sem (questions in js/questions-sem7.js) ---- */
  { id:'CD', sem:'IV-I',   name:'Compiler Design',               short:'CD',   icon:'⚙️', accent:'#1abc9c',
    topics:['CD'],   pdf:'notes/cd.pdf',   blurb:'Lexing, parsing, SDT, code generation' },

  { id:'CNS', sem:'IV-I',  name:'Cryptography & Network Security', short:'CNS', icon:'🔐', accent:'#e74c3c',
    topics:['CNS'],  pdf:'notes/cns.pdf',  blurb:'Ciphers, RSA, hashing, TLS, IPsec' },

  { id:'SPPM', sem:'IV-I', name:'Software Process & Project Mgmt', short:'SPPM', icon:'📋', accent:'#3498db',
    topics:['SPPM'], pdf:'notes/sppm.pdf', blurb:'CMM, life-cycle phases, metrics' },

  { id:'CC', sem:'IV-I',   name:'Cloud Computing',               short:'Cloud', icon:'☁️', accent:'#5dade2',
    topics:['CC'],   pdf:'notes/cc.pdf',   blurb:'Service models, virtualization, MapReduce' },

  /* ---- B.Tech II Year, R25 (questions in js/questions-year2.js) ---- */
  { id:'DM',      sem:'II-I',  name:'Discrete Mathematics',            short:'DM',   icon:'🔣', accent:'#6c5ce7',
    topics:['DM'],      pdf:'notes/dm.pdf',      blurb:'Logic, sets, algebra, counting, graphs' },

  { id:'COA',     sem:'II-I',  name:'Computer Organization & Architecture', short:'COA', icon:'🖲️', accent:'#e17055',
    topics:['COA'],     pdf:'notes/coa.pdf',     blurb:'Logic circuits, RTL, CPU, memory, I/O' },

  { id:'OOPJ',    sem:'II-I',  name:'OOP through Java',                short:'Java', icon:'☕', accent:'#e67e22',
    topics:['OOPJ'],    pdf:'notes/oopj.pdf',    blurb:'Inheritance, exceptions, threads, Swing' },

  { id:'SE',      sem:'II-I',  name:'Software Engineering',            short:'SE',   icon:'🛠️', accent:'#0984e3',
    topics:['SE'],      pdf:'notes/se.pdf',      blurb:'Process models, SRS, UML, testing, risk' },

  { id:'DBMS_II', sem:'II-I',  name:'Database Management Systems',     short:'DBMS', icon:'🗄️', accent:'#ffb020',
    topics:['DBMS_II'], pdf:'notes/dbms-ii.pdf', blurb:'ER, SQL, normalization, transactions, B+ trees' },

  { id:'COSM',    sem:'II-II', name:'Computer Oriented Statistical Methods', short:'COSM', icon:'📊', accent:'#00cec9',
    topics:['COSM'],    pdf:'notes/cosm.pdf',    blurb:'Distributions, estimation, tests, regression' },

  { id:'OS_II',   sem:'II-II', name:'Operating Systems',               short:'OS',   icon:'🖥️', accent:'#2ecc71',
    topics:['OS_II'],   pdf:'notes/os-ii.pdf',   blurb:'Scheduling, deadlocks, sync, memory, files' },

  { id:'ADA',     sem:'II-II', name:'Algorithms Design & Analysis',    short:'ADA',  icon:'🧮', accent:'#16a085',
    topics:['ADA'],     pdf:'notes/ada.pdf',     blurb:'Divide & conquer, DP, greedy, NP' },

  { id:'CN_II',   sem:'II-II', name:'Computer Networks',               short:'CN',   icon:'🌐', accent:'#9b59b6',
    topics:['CN_II'],   pdf:'notes/cn-ii.pdf',   blurb:'Top-down: apps, TCP/UDP, IP, link layer' },

  { id:'ML_II',   sem:'II-II', name:'Machine Learning',                short:'ML',   icon:'🤖', accent:'#27ae60',
    topics:['ML_II'],   pdf:'notes/ml-ii.pdf',   blurb:'Features, regression, classification, clustering' },

  /* ---- B.Tech III Year (questions in js/questions-year3.js) ---- */
  { id:'CN_III', sem:'III-I', name:'Computer Networks',         short:'CN',   icon:'🌐', accent:'#9b59b6',
    topics:['CN_III'], pdf:'notes/cn-iii.pdf', blurb:'R22: data link, MAC, routing, TCP/UDP, DNS' },

  { id:'DAA', sem:'III-I',    name:'Design & Analysis of Algorithms', short:'DAA',  icon:'🧮', accent:'#16a085',
    topics:['DAA'],    pdf:'notes/daa.pdf',    blurb:'Divide & conquer, DP, greedy, NP' },

  { id:'DEVOPS', sem:'III-I', name:'DevOps',                         short:'DevOps', icon:'🔁', accent:'#2980b9',
    topics:['DEVOPS'], pdf:'notes/devops.pdf', blurb:'CI/CD, Git, Jenkins, Docker, Ansible' },

  { id:'PPL', sem:'III-I',    name:'Principles of Programming Languages', short:'PPL', icon:'📝', accent:'#8e44ad',
    topics:['PPL'],    pdf:'notes/ppl.pdf',    blurb:'Syntax, binding, subprograms, paradigms' },

  { id:'NLP', sem:'III-I',    name:'Natural Language Processing',    short:'NLP',  icon:'💬', accent:'#d35400',
    topics:['NLP'],    pdf:'notes/nlp.pdf',    blurb:'Morphology, parsing, semantics, n-grams' },

  { id:'ML', sem:'III-II',     name:'Machine Learning',               short:'ML',   icon:'🤖', accent:'#27ae60',
    topics:['ML'],     pdf:'notes/ml.pdf',     blurb:'Perceptrons, SVM, trees, PCA, RL' },

  { id:'FLAT', sem:'III-II',   name:'Formal Languages & Automata Theory', short:'FLAT', icon:'🔤', accent:'#c0392b',
    topics:['FLAT'],   pdf:'notes/flat.pdf',   blurb:'DFA, regex, CFG, PDA, Turing machines' },

  { id:'AI', sem:'III-II',     name:'Artificial Intelligence',        short:'AI',   icon:'🧠', accent:'#f39c12',
    topics:['AI'],     pdf:'notes/ai.pdf',     blurb:'Search, games, logic, planning, Bayes' },

  { id:'IOT', sem:'III-II',    name:'Internet of Things',             short:'IoT',  icon:'📡', accent:'#00b894',
    topics:['IOT'],    pdf:'notes/iot.pdf',    blurb:'M2M, NETCONF, Raspberry Pi, case studies' },
];

/* Look up a subject by id (safe). */
function getSubject(id){
  return SUBJECTS.find(s => s.id === id) || null;
}
