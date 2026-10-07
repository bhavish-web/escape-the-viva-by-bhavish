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
         CD, CNS, SPPM, CC — the last four live in questions-sem7.js).
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
  { id:'CD',   name:'Compiler Design',               short:'CD',   icon:'⚙️', accent:'#1abc9c',
    topics:['CD'],   pdf:'notes/cd.pdf',   blurb:'Lexing, parsing, SDT, code generation' },

  { id:'CNS',  name:'Cryptography & Network Security', short:'CNS', icon:'🔐', accent:'#e74c3c',
    topics:['CNS'],  pdf:'notes/cns.pdf',  blurb:'Ciphers, RSA, hashing, TLS, IPsec' },

  { id:'SPPM', name:'Software Process & Project Mgmt', short:'SPPM', icon:'📋', accent:'#3498db',
    topics:['SPPM'], pdf:'notes/sppm.pdf', blurb:'CMM, life-cycle phases, metrics' },

  { id:'CC',   name:'Cloud Computing',               short:'Cloud', icon:'☁️', accent:'#5dade2',
    topics:['CC'],   pdf:'notes/cc.pdf',   blurb:'Service models, virtualization, MapReduce' },
];

/* Look up a subject by id (safe). */
function getSubject(id){
  return SUBJECTS.find(s => s.id === id) || null;
}
