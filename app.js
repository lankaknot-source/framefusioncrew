import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateEmail
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0vt0PLITxer_pn7mbGmJpq_vHq9D6E-Q",
  authDomain: "ffcrew.firebaseapp.com",
  projectId: "ffcrew",
  storageBucket: "ffcrew.firebasestorage.app",
  messagingSenderId: "627390956940",
  appId: "1:627390956940:web:108aa66c5ce7456b8702a9"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const EMAILJS_CONFIG = {
  serviceId: "service_h7agh7l",
  templateId: "template_opov7qi",
  publicKey: "g4vHiDjwBll1fqO99"
};

const PROJECT_SERVICE_PRESETS = [
  "Live Production",
  "Photography",
  "Videography",
  "After Movie",
  "Live Streaming",
  "Highlights / Social Media"
];

const TASK_TEMPLATES = {
  "Live Production":[
    "Camera positions and framing checked",
    "Primary and backup internet tested",
    "Audio feeds and commentary checked",
    "Graphics / scorecard system ready",
    "Recording storage and backup verified"
  ],
  "Photography":[
    "Camera bodies and lenses checked",
    "Batteries and memory cards prepared",
    "Client shot list confirmed",
    "Photo backup workflow ready",
    "Final delivery folder prepared"
  ],
  "Videography":[
    "Camera and audio kit checked",
    "Gimbal / tripod setup checked",
    "Batteries and media prepared",
    "Shot list / schedule confirmed",
    "Footage backup plan ready"
  ],
  "After Movie":[
    "All footage backed up",
    "Selects / timeline organized",
    "Rough cut completed",
    "Color and audio finishing completed",
    "Final export and client delivery completed"
  ],
  "Live Streaming":[
    "Streaming account and event key checked",
    "Primary encoder tested",
    "Backup connection tested",
    "Audio sync checked",
    "Stream recording enabled"
  ],
  "Highlights / Social Media":[
    "Content moments list confirmed",
    "Vertical / horizontal formats planned",
    "Brand assets ready",
    "Fast edit workflow prepared",
    "Upload / publishing checklist confirmed"
  ]
};


const STORAGE_KEYS = {
  crew: "framefusion_crew_v1",
  projects: "framefusion_projects_v1",
  signatures: "framefusion_signatures_v1",
  receipts: "framefusion_receipts_v1",
  settings: "framefusion_settings_v1",
  rentals: "framefusion_rentals_v1",
  tasks: "framefusion_tasks_v1"
};

const CLOUD_COLLECTIONS = {
  crew: "framefusion_crew",
  projects: "framefusion_projects",
  signatures: "framefusion_signatures",
  receipts: "framefusion_receipts",
  settings: "framefusion_settings",
  rentals: "framefusion_rentals",
  tasks: "framefusion_tasks",
  users: "framefusion_users"
};

let crew = load(STORAGE_KEYS.crew, []);
let projects = load(STORAGE_KEYS.projects, []);
let signatureLibrary = load(STORAGE_KEYS.signatures, []);
let receipts = load(STORAGE_KEYS.receipts, []);
let rentals = load(STORAGE_KEYS.rentals, []);
let tasks = load(STORAGE_KEYS.tasks, []);
let currentAuthUser = null;
let currentUserProfile = null;
let userProfiles = [];
let secondaryUserAuth = null;
let appSettings = load(STORAGE_KEYS.settings, {
  id:"company",
  companyName:"FrameFusion Studio",
  senderEmail:"management.framefusion@gmail.com",
  replyToEmail:"management.framefusion@gmail.com",
  footerText:"Thank you for working with FrameFusion Studio."
});
let cloudReady = false;
let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let cloudSyncPending = false;
let editingProjectCrew = [];
let editingEquipmentItems = [];
let editingProjectServices = [];
let activeProjectServiceCrewId = null;
let activeReportProjectId = null;
let activeSignatureRole = null;
let signaturePadHasInk = false;
let signaturePadDrawing = false;
let signaturePadLastPoint = null;

function load(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
function saveLocalCache(){
  localStorage.setItem(STORAGE_KEYS.crew, JSON.stringify(crew));
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  localStorage.setItem(STORAGE_KEYS.signatures, JSON.stringify(signatureLibrary));
  localStorage.setItem(STORAGE_KEYS.receipts, JSON.stringify(receipts));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appSettings));
  localStorage.setItem(STORAGE_KEYS.rentals, JSON.stringify(rentals));
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}


const AUTH_USERNAME_DOMAIN = "framefusion.local";
const AUTH_USERNAME_LEGACY_DOMAINS = ["framefusion.lk"];

function normalizeUsername(value){
  return String(value||"")
    .trim()
    .toLowerCase()
    .replace(/\s+/g,"")
    .replace(/[^a-z0-9._-]/g,"");
}
function isValidUsername(value){
  const u=normalizeUsername(value);
  return u.length>=3 && u.length<=32 && /^[a-z0-9][a-z0-9._-]*$/.test(u);
}
function authEmailFromUsername(username){
  return `${normalizeUsername(username)}@${AUTH_USERNAME_DOMAIN}`;
}
function authEmailCandidatesFromUsername(username){
  const clean=normalizeUsername(username);
  return [
    `${clean}@${AUTH_USERNAME_DOMAIN}`,
    ...AUTH_USERNAME_LEGACY_DOMAINS.map(domain=>`${clean}@${domain}`)
  ];
}
function usernameFromAuthEmail(email){
  const e=String(email||"").trim().toLowerCase();
  if(e.endsWith(`@${AUTH_USERNAME_DOMAIN}`)) return e.slice(0,-(`@${AUTH_USERNAME_DOMAIN}`.length));
  return normalizeUsername(e.split("@")[0]||"admin") || "admin";
}
function roleName(role){
  return ({admin:"Admin",director:"Director",manager:"Manager",accountant:"Accountant"})[role]||"User";
}
function isActiveProfile(){
  return !!currentUserProfile && currentUserProfile.active!==false;
}
function userRole(){
  return currentUserProfile?.role||"";
}
function isAdmin(){
  return userRole()==="admin";
}
function isManager(){
  return ["admin","director","manager"].includes(userRole());
}
function isFinance(){
  return ["admin","director","manager","accountant"].includes(userRole());
}
function isCrewUser(){
  return false;
}
function canView(view){
  const role=userRole();
  const map={
    admin:["dashboard","projects","crew","tasks","payments","rentals","financial","backup","users"],
    director:["dashboard","projects","crew","tasks","payments","rentals","financial","backup"],
    manager:["dashboard","projects","crew","tasks","payments","rentals","financial","backup"],
    accountant:["dashboard","tasks","payments","rentals","financial"]
  };
  return (map[role]||[]).includes(view);
}
function canManageTasks(){
  return isManager();
}
function canManageProjects(){
  return isManager();
}
function canManageCrew(){
  return isManager();
}
function canManagePayments(){
  return isFinance();
}
function requirePermission(ok,message="You do not have permission for this action."){
  if(ok) return true;
  toast(message);
  return false;
}
function applyRoleAccess(){
  const allowed=[...document.querySelectorAll(".nav-btn")];
  allowed.forEach(btn=>{
    btn.classList.toggle("hidden",!canView(btn.dataset.view));
  });

  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",!isAdmin()));
  document.querySelectorAll(".manager-action").forEach(el=>el.classList.toggle("hidden",!isManager()));

  const quickCrew=document.getElementById("quickCrewBtn");
  const quickProject=document.getElementById("quickProjectBtn");
  if(quickCrew) quickCrew.classList.toggle("hidden",!canManageCrew());
  if(quickProject) quickProject.classList.toggle("hidden",!canManageProjects());

  const topName=document.getElementById("topUserName");
  const topRole=document.getElementById("topUserRole");
  if(topName) topName.textContent=currentUserProfile?.username||currentUserProfile?.displayName||usernameFromAuthEmail(currentAuthUser?.email)||"User";
  if(topRole) topRole.textContent=roleName(userRole());

  document.body.dataset.userRole=userRole();

  const visibleCurrent=document.querySelector(".nav-btn.active:not(.hidden)")?.dataset.view;
  if(!visibleCurrent){
    const fallback="dashboard";
    if(canView(fallback)) setView(fallback);
  }
}
function showAuthMessage(message,type=""){
  const el=document.getElementById("authMessage");
  if(!el) return;
  el.textContent=message||"";
  el.className=`auth-message ${type}`.trim();
}
function showLoginGate(){
  document.getElementById("authGate")?.classList.remove("hidden");
  document.getElementById("appShell")?.classList.add("hidden");
  document.getElementById("loginPanel")?.classList.remove("hidden");
  document.getElementById("bootstrapPanel")?.classList.add("hidden");
}
function showBootstrapGate(user){
  document.getElementById("authGate")?.classList.remove("hidden");
  document.getElementById("appShell")?.classList.add("hidden");
  document.getElementById("loginPanel")?.classList.add("hidden");
  document.getElementById("bootstrapPanel")?.classList.remove("hidden");
  const suggested=usernameFromAuthEmail(user.email||"");
  const box=document.getElementById("bootstrapIdentity");
  if(box) box.innerHTML=`<b>Management Account</b><small>Firebase UID: ${escapeHtml(user.uid)}</small>`;
  const usernameInput=document.getElementById("bootstrapUsername");
  if(usernameInput && !usernameInput.value) usernameInput.value=suggested;
  lucide.createIcons();
}
function showAuthenticatedApp(){
  document.getElementById("authGate")?.classList.add("hidden");
  document.getElementById("appShell")?.classList.remove("hidden");
  applyRoleAccess();
  lucide.createIcons();
}
async function loadCurrentUserProfile(user){
  const snap=await getDoc(doc(db,CLOUD_COLLECTIONS.users,user.uid));
  if(!snap.exists()) return null;
  return {id:snap.id,...snap.data()};
}
async function bootstrapAdminProfile(){
  if(!currentAuthUser) return;
  const username=normalizeUsername(document.getElementById("bootstrapUsername")?.value||"admin");
  if(!isValidUsername(username)){
    showAuthMessage("Username must be 3–32 characters using letters, numbers, dot, dash or underscore.","error");
    return;
  }
  const authEmail=authEmailFromUsername(username);
  const profile={
    id:currentAuthUser.uid,
    uid:currentAuthUser.uid,
    username,
    displayName:username,
    role:"admin",
    crewId:"",
    active:true,
    createdAt:Date.now(),
    updatedAt:Date.now()
  };
  try{
    // Convert a freshly signed-in legacy/first Firebase account to the internal
    // synthetic auth email so future sign-ins require only Username + Password.
    const currentEmail=String(currentAuthUser.email||"").toLowerCase();
    const acceptedEmails=authEmailCandidatesFromUsername(username);
    if(!acceptedEmails.includes(currentEmail)){
      await updateEmail(currentAuthUser,authEmail);
    }
    const payload={...profile};
    delete payload.id;
    await setDoc(doc(db,CLOUD_COLLECTIONS.users,currentAuthUser.uid),payload);
    currentUserProfile=profile;
    toast("Admin username profile created");
    showAuthenticatedApp();
    await initializeFirestoreData();
  }catch(error){
    console.error(error);
    const msg=error?.code==="auth/email-already-in-use"
      ? "That username is already in use."
      : "Admin profile could not be created. Keep the temporary setup rules active and try again.";
    showAuthMessage(msg,"error");
  }
}

async function migrateLegacyManagementUsername(user,profile){
  if(!user||!profile||profile.username) return profile;
  const username=usernameFromAuthEmail(user.email||"");
  if(!isValidUsername(username)) return profile;
  const migrated={...profile,username,displayName:profile.displayName||username,updatedAt:Date.now()};
  try{
    const currentEmail=String(user.email||"").toLowerCase();
    const acceptedEmails=authEmailCandidatesFromUsername(username);
    // Existing username@framefusion.lk accounts are already valid username accounts.
    // Do not force-change them to .local.
    if(!acceptedEmails.includes(currentEmail)){
      await updateEmail(user,authEmailFromUsername(username));
    }
    const payload=cleanForFirestore(migrated);
    delete payload.id;
    await setDoc(doc(db,CLOUD_COLLECTIONS.users,user.uid),payload);
    return migrated;
  }catch(error){
    console.warn("Legacy username migration skipped:",error);
    // Current session still works; Admin can create another username account if needed.
    return migrated;
  }
}

async function handleAuthUser(user){
  currentAuthUser=user||null;
  currentUserProfile=null;
  if(!user){
    cloudReady=false;
    showLoginGate();
    return;
  }
  try{
    let profile=await loadCurrentUserProfile(user);
    if(!profile){
      showBootstrapGate(user);
      return;
    }
    if(profile.active===false){
      showAuthMessage("This FrameFusion user account is disabled.","error");
      await signOut(auth);
      return;
    }
    if(profile.role==="crew"){
      showAuthMessage("Crew logins are disabled. This app is for management users only.","error");
      await signOut(auth);
      return;
    }
    profile=await migrateLegacyManagementUsername(user,profile);
    currentUserProfile=profile;
    showAuthenticatedApp();
    await initializeFirestoreData();
    const defaultView="dashboard";
    if(canView(defaultView)) setView(defaultView);
  }catch(error){
    console.error("User profile load failed",error);
    showAuthMessage("Could not load the FrameFusion user profile. Check Firestore rules and internet connection.","error");
    showLoginGate();
  }
}
function initAuth(){
  onAuthStateChanged(auth,handleAuthUser);
}
async function loginUser(username,password){
  const clean=normalizeUsername(username);
  if(!isValidUsername(clean)){
    showAuthMessage("Enter a valid username.","error");
    return;
  }

  showAuthMessage("Signing in…");
  let lastError=null;

  for(const authEmail of authEmailCandidatesFromUsername(clean)){
    try{
      await signInWithEmailAndPassword(auth,authEmail,password);
      showAuthMessage("");
      return;
    }catch(error){
      lastError=error;
      // Try the next internal username domain when the credentials do not match.
      if(![
        "auth/invalid-credential",
        "auth/user-not-found",
        "auth/wrong-password",
        "auth/invalid-email"
      ].includes(error?.code)){
        break;
      }
    }
  }

  console.error("Username sign in failed:",lastError);
  showAuthMessage("Sign in failed. Check the username and password.","error");
}
function cloudSyncAllowed(){
  return isFinance();
}

function save(){
  saveLocalCache();
  scheduleCloudSync();
}
function setCloudStatus(state,label){
  const el=document.getElementById("cloudStatus");
  if(!el) return;
  el.classList.remove("cloud-status-connecting","cloud-status-online","cloud-status-offline");
  el.classList.add(`cloud-status-${state}`);
  const text=el.querySelector("span:last-child");
  if(text) text.textContent=label;
}
function cleanForFirestore(value){
  return JSON.parse(JSON.stringify(value));
}
async function readCloudCollection(collectionName){
  const snap=await getDocs(collection(db,collectionName));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function syncOneCollection(collectionName,items){
  const remote=await getDocs(collection(db,collectionName));
  const localIds=new Set(items.map(item=>String(item.id)));
  const writes=items.map(item=>{
    const payload=cleanForFirestore(item);
    delete payload.id;
    return setDoc(doc(db,collectionName,String(item.id)),payload);
  });
  const deletes=[];
  remote.forEach(remoteDoc=>{
    if(!localIds.has(remoteDoc.id)){
      deletes.push(deleteDoc(doc(db,collectionName,remoteDoc.id)));
    }
  });
  await Promise.all([...writes,...deletes]);
}
async function syncAllToFirestore(){
  if(!cloudReady){
    cloudSyncPending=true;
    return;
  }
  if(cloudSyncInFlight){
    cloudSyncPending=true;
    return;
  }
  cloudSyncInFlight=true;
  cloudSyncPending=false;
  setCloudStatus("connecting","Syncing Firestore");
  try{
    const jobs=[];
    if(isManager()){
      jobs.push(
        syncOneCollection(CLOUD_COLLECTIONS.crew,crew),
        syncOneCollection(CLOUD_COLLECTIONS.projects,projects),
        syncOneCollection(CLOUD_COLLECTIONS.signatures,signatureLibrary),
        syncOneCollection(CLOUD_COLLECTIONS.receipts,receipts),
        syncOneCollection(CLOUD_COLLECTIONS.rentals,rentals)
      );
      if(isAdmin()){
        jobs.push(syncOneCollection(CLOUD_COLLECTIONS.settings,[{id:"company",...appSettings}]));
      }
    }else if(userRole()==="accountant"){
      jobs.push(
        syncOneCollection(CLOUD_COLLECTIONS.projects,projects),
        syncOneCollection(CLOUD_COLLECTIONS.receipts,receipts),
        syncOneCollection(CLOUD_COLLECTIONS.rentals,rentals)
      );
    }
    await Promise.all(jobs);
    setCloudStatus("online","Firestore Synced");
  }catch(error){
    console.error("Firestore sync failed:",error);
    setCloudStatus("offline","Firestore Offline");
  }finally{
    cloudSyncInFlight=false;
    if(cloudSyncPending){
      cloudSyncPending=false;
      setTimeout(syncAllToFirestore,300);
    }
  }
}
function scheduleCloudSync(){
  if(!cloudSyncAllowed()) return;
  if(!cloudReady){
    cloudSyncPending=true;
    return;
  }
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer=setTimeout(syncAllToFirestore,550);
}

function migrateRentalExpenseRecords(){
  let changed=false;
  rentals=rentals.map(r=>{
    if(r.supplierName) return r;
    if(r.customerName || r.customerEmail || r.customerPhone){
      changed=true;
      return {
        ...r,
        supplierName:r.customerName||"",
        supplierEmail:r.customerEmail||"",
        supplierPhone:r.customerPhone||"",
        projectId:r.projectId||"",
        projectName:r.projectName||"",
        migratedFromV9:true
      };
    }
    return r;
  });
  if(changed) saveLocalCache();
}


function normalizeDepartmentCrew(list){
  return (Array.isArray(list)?list:[]).map(m=>({
    crewId:m.crewId||"",
    name:String(m.name||"").trim(),
    role:String(m.role||"").trim(),
    email:String(m.email||""),
    payment:Math.max(0,Number(m.payment||0)),
    payments:Array.isArray(m.payments)?m.payments:[]
  }));
}
function normalizeProjectServices(p){
  if(!p) return [];
  if(!Array.isArray(p.services)) p.services=[];
  p.services=p.services
    .filter(s=>s && String(s.name||"").trim())
    .map(s=>({
      id:s.id||uid("service"),
      name:String(s.name||"").trim(),
      budget:Math.max(0,Number(s.budget||0)),
      productionCost:Math.max(0,Number(s.productionCost||0)),
      targetProfit:Math.max(0,Number(s.targetProfit||0)),
      crew:normalizeDepartmentCrew(s.crew)
    }));
  return p.services;
}
function serviceCrewAllocationTotal(service){
  return (service?.crew||[]).reduce((sum,m)=>sum+Number(m.payment||0),0);
}
function serviceCrewPaidTotal(service){
  return (service?.crew||[]).reduce((sum,m)=>sum+crewPaymentsTotal(m),0);
}
function projectCrewAssignments(p){
  return (p?.services||[]).flatMap(s=>(s.crew||[]).map(m=>({...m,serviceId:s.id,serviceName:s.name})));
}
function projectCrewAllocationTotal(p){
  return (p?.services||[]).reduce((sum,s)=>sum+serviceCrewAllocationTotal(s),0);
}
function projectCrewPaidTotal(p){
  return (p?.services||[]).reduce((sum,s)=>sum+serviceCrewPaidTotal(s),0);
}
function projectProductionCostTotal(p){
  return (p?.services||[]).reduce((sum,s)=>sum+Number(s.productionCost||0),0);
}
function projectTargetProfitTotal(p){
  return (p?.services||[]).reduce((sum,s)=>sum+Number(s.targetProfit||0),0);
}
function serviceBudgetProfit(service){
  return Number(service?.budget||0)-Number(service?.productionCost||0)-serviceCrewAllocationTotal(service);
}
function syncProjectLegacyTotals(p){
  if(!p) return;
  normalizeProjectServices(p);
  p.equipment=projectProductionCostTotal(p);
  p.equipmentMode="total";
  p.equipmentItems=[];
  p.targetProfit=projectTargetProfitTotal(p);
  p.crew=projectCrewAssignments(p);
  p.departmentBudgetVersion=14;
}
function migrateProjectServices(){
  let changed=false;
  projects.forEach(p=>{
    const hadServices=Array.isArray(p.services) && p.services.length;
    if(!hadServices){
      p.services=[{
        id:uid("service"),
        name:"General Production",
        budget:Math.max(0,Number(p.revenue||0)),
        productionCost:Math.max(0,Number(p.equipment||0)),
        targetProfit:Math.max(0,Number(p.targetProfit||0)),
        crew:normalizeDepartmentCrew(p.crew)
      }];
      changed=true;
    }else if(Number(p.departmentBudgetVersion||0)<14){
      // v13 had revenue allocation only. Preserve every old value by moving the
      // previous project-wide production cost, target and crew into the first department.
      const original=JSON.parse(JSON.stringify(p.services));
      p.services=original.map((s,i)=>({
        id:s.id||uid("service"),
        name:String(s.name||"Service").trim(),
        budget:Math.max(0,Number(s.budget||0)),
        productionCost:i===0?Math.max(0,Number(p.equipment||0)):0,
        targetProfit:i===0?Math.max(0,Number(p.targetProfit||0)):0,
        crew:i===0?normalizeDepartmentCrew(p.crew):[]
      }));
      changed=true;
    }else{
      const before=JSON.stringify(p.services);
      normalizeProjectServices(p);
      if(before!==JSON.stringify(p.services)) changed=true;
    }
    const legacyBefore=JSON.stringify({
      equipment:p.equipment,targetProfit:p.targetProfit,crew:p.crew,version:p.departmentBudgetVersion
    });
    syncProjectLegacyTotals(p);
    const legacyAfter=JSON.stringify({
      equipment:p.equipment,targetProfit:p.targetProfit,crew:p.crew,version:p.departmentBudgetVersion
    });
    if(legacyBefore!==legacyAfter) changed=true;
  });
  if(changed) saveLocalCache();
}
function serviceBudgetsTotal(services){
  return (services||[]).reduce((sum,s)=>sum+Number(s.budget||0),0);
}
function projectServiceById(projectId,serviceId){
  if(!projectId || !serviceId) return null;
  const p=projects.find(x=>x.id===projectId);
  return (p?.services||[]).find(s=>s.id===serviceId)||null;
}

function projectRentalPaid(projectId){
  if(!projectId) return 0;
  return rentals
    .filter(r=>r.projectId===projectId)
    .reduce((sum,r)=>sum+rentalPaymentsTotal(r),0);
}
function projectServiceRentalPaid(projectId,serviceId){
  if(!projectId || !serviceId) return 0;
  return rentals
    .filter(r=>r.projectId===projectId && r.serviceId===serviceId)
    .reduce((sum,r)=>sum+rentalPaymentsTotal(r),0);
}

async function initializeFirestoreData(){
  setCloudStatus("connecting","Connecting Firestore");
  try{
    const [cloudCrew,cloudProjects,cloudSignatures,cloudReceipts,cloudSettings,cloudRentals,cloudTasks]=await Promise.all([
      readCloudCollection(CLOUD_COLLECTIONS.crew),
      readCloudCollection(CLOUD_COLLECTIONS.projects),
      readCloudCollection(CLOUD_COLLECTIONS.signatures),
      readCloudCollection(CLOUD_COLLECTIONS.receipts),
      readCloudCollection(CLOUD_COLLECTIONS.settings),
      readCloudCollection(CLOUD_COLLECTIONS.rentals),
      readCloudCollection(CLOUD_COLLECTIONS.tasks)
    ]);

    const cloudHasData=cloudCrew.length || cloudProjects.length || cloudSignatures.length || cloudReceipts.length || cloudSettings.length || cloudRentals.length || cloudTasks.length;
    if(cloudHasData){
      crew=cloudCrew;
      projects=cloudProjects;
      signatureLibrary=cloudSignatures;
      receipts=cloudReceipts;
      rentals=cloudRentals;
      tasks=cloudTasks;
      if(cloudSettings.length){
        appSettings={...appSettings,...cloudSettings[0],id:"company"};
      }
      saveLocalCache();
    }

    migrateRentalExpenseRecords();
    migrateRentalPaymentArrays();
    migrateProjectServices();
    cloudReady=true;

    if(!crew.length && !projects.length && isManager()){
      seedDemo();
    }else if(!cloudHasData && isManager()){
      await syncAllToFirestore();
    }

    renderDashboard();
    renderProjects();
    renderCrew();
    renderPayments();
    renderRentals();
    renderFinancial();
    renderTasks();
    if(isAdmin()) await loadUserProfiles();
    setCloudStatus("online","Firestore Connected");
  }catch(error){
    console.error("Firestore connection failed:",error);
    cloudReady=false;
    setCloudStatus("offline","Using Local Cache");
    if(!crew.length && !projects.length && isManager()) seedDemo();
    migrateRentalExpenseRecords();
    migrateRentalPaymentArrays();
    migrateProjectServices();
    renderDashboard();
    renderProjects();
    renderCrew();
    renderPayments();
    renderRentals();
    renderFinancial();
    renderTasks();
  }
}
function uid(prefix="id"){
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}
function money(v){
  return `LKR ${Number(v || 0).toLocaleString("en-LK")}`;
}
function escapeHtml(v=""){
  return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function formatDate(v){
  if(!v) return "No date";
  const d = new Date(v + "T00:00:00");
  if(isNaN(d)) return v;
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
}
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>el.classList.remove("show"),2200);
}
function openModal(id){
  document.getElementById(id).classList.remove("hidden");
  if(id==="reportModal") document.body.classList.add("report-open");
}
function closeModal(id){
  document.getElementById(id).classList.add("hidden");
  if(id==="reportModal") document.body.classList.remove("report-open");
}

function seedDemo(){
  if(crew.length || projects.length) return;
  crew = [
    {id:uid("crew"),name:"Sithum",role:"Broadcasting Director",rate:7000,phone:"",email:"",notes:""},
    {id:uid("crew"),name:"Kalana",role:"Producer",rate:7000,phone:"",email:"",notes:""},
    {id:uid("crew"),name:"Uditha",role:"Cameraman",rate:5750,phone:"",email:"",notes:""},
    {id:uid("crew"),name:"Achira",role:"Cameraman",rate:5750,phone:"",email:"",notes:""},
    {id:uid("crew"),name:"Trimal",role:"Cameraman",rate:5750,phone:"",email:"",notes:""},
    {id:uid("crew"),name:"Dulneth",role:"Digital Scorecard Operator",rate:6750,phone:"",email:"",notes:""}
  ];
  projects = [{
    id:uid("project"),
    name:"Match Live Coverage Budget",
    date:"",
    client:"",
    clientEmail:"",
    location:"",
    revenue:120000,
    services:[{
      id:uid("service"),
      name:"Live Production",
      budget:120000,
      productionCost:70000,
      targetProfit:12000,
      crew:crew.map(c=>({crewId:c.id,name:c.name,role:c.role,email:c.email||"",payment:c.rate,payments:[]}))
    }],
    equipment:70000,
    equipmentMode:"total",
    equipmentItems:[],
    targetProfit:12000,
    departmentBudgetVersion:14,
    subtitle:"Official Budget Breakdown & Crew Payment Allocation",
    directorName:"",
    managerName:"",
    signatures:{director:"",manager:""},
    signatureRefs:{director:"",manager:""},
    eventPayments:[],
    crew:[],
    createdAt:Date.now(),
    updatedAt:Date.now()
  }];
  save();
}

function equipmentItemsTotal(items){
  return (items||[]).reduce((sum,item)=>sum+Number(item.cost||0),0);
}
function equipmentTotalForProject(p){
  if(Array.isArray(p?.services) && p.services.length){
    return projectProductionCostTotal(p);
  }
  if((p?.equipmentMode||"total")==="itemized" && Array.isArray(p?.equipmentItems)){
    return equipmentItemsTotal(p.equipmentItems);
  }
  return Number(p?.equipment||0);
}
function projectNumbers(p){
  normalizeProjectServices(p);
  const crewTotal=projectCrewAllocationTotal(p);
  const equipmentTotal=projectProductionCostTotal(p);
  const targetProfit=projectTargetProfitTotal(p);
  const rentalPaid=projectRentalPaid(p?.id);
  const productionOther=Math.max(0,equipmentTotal-rentalPaid);
  const productionOverrun=Math.max(0,rentalPaid-equipmentTotal);
  const balance=Number(p?.revenue||0)-equipmentTotal;
  const netProfit=Number(p?.revenue||0)-equipmentTotal-crewTotal;
  return {crewTotal,equipmentTotal,targetProfit,rentalPaid,productionOther,productionOverrun,balance,netProfit};
}

function setView(view){
  if(currentUserProfile && !canView(view)){
    toast("This section is not available for your role.");
    return;
  }
  document.querySelectorAll(".app-view").forEach(v=>v.classList.add("hidden"));
  const target = document.getElementById(`view-${view}`);
  if(target) target.classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  const names = {dashboard:"Dashboard",projects:"Projects",crew:"Crew Members",tasks:"Project Tasks",payments:"Payments & Receipts",rentals:"Rental Payments",financial:"Financial",backup:"Backup & Restore",users:"Users & Roles"};
  document.getElementById("pageTitle").textContent = names[view] || "FrameFusion";
  if(view==="dashboard") renderDashboard();
  if(view==="projects") renderProjects();
  if(view==="crew") renderCrew();
  if(view==="tasks") renderTasks();
  if(view==="payments") renderPayments();
  if(view==="rentals") renderRentals();
  if(view==="financial") renderFinancial();
  if(view==="users") renderUsers();
  lucide.createIcons();
}

function renderDashboard(){
  const totalRevenue = projects.reduce((s,p)=>s+Number(p.revenue||0),0);
  const totalCrew = projects.reduce((s,p)=>s+projectNumbers(p).crewTotal,0);
  const totalProfit = projects.reduce((s,p)=>s+projectNumbers(p).netProfit,0);

  const visibleTasks=tasksForCurrentUser(tasks);
  const pendingTasks=visibleTasks.filter(t=>t.status!=="done").length;
  const stats = isCrewUser()
    ? [
        ["list-checks",visibleTasks.length,"Assigned Tasks"],
        ["clock-3",pendingTasks,"Open Tasks"],
        ["check-circle-2",visibleTasks.filter(t=>t.status==="done").length,"Completed"],
        ["calendar-days",visibleTasks.filter(t=>isTaskOverdue(t)).length,"Overdue"]
      ]
    : [
        ["folder-kanban",projects.length,"Total Projects"],
        ["users",crew.length,"Crew Members"],
        ["list-checks",pendingTasks,"Open Tasks"],
        ["badge-dollar-sign",money(totalProfit),"Net Profit"]
      ];
  document.getElementById("dashboardStats").innerHTML = stats.map(([icon,val,label])=>`
    <div class="stat-card">
      <div class="stat-top"><span class="stat-icon"><i data-lucide="${icon}"></i></span></div>
      <div class="stat-value">${escapeHtml(val)}</div>
      <div class="stat-label">${label}</div>
    </div>`).join("");

    const recent = [...projects].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5);
  document.getElementById("recentProjects").innerHTML = recent.length ? `
    <div class="divide-y divide-slate-100 mt-3">
      ${recent.map(p=>{
        const n=projectNumbers(p);
        return `<div class="py-3 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <div class="font-black text-ffnavy truncate">${escapeHtml(p.name)}</div>
            <div class="text-xs text-slate-400 mt-1">${formatDate(p.date)} • ${projectCrewAssignments(p).length} crew assignments</div>
          </div>
          <div class="text-right flex-none">
            <div class="font-black text-ffgreen">${money(n.netProfit)}</div>
            <button class="text-xs font-bold text-sky-600 mt-1" onclick="openReport('${p.id}')">Open report</button>
          </div>
        </div>`;
      }).join("")}
    </div>` : emptyState("folder-plus","No projects yet","Create your first project to generate a budget report.");
}

function emptyState(icon,title,copy){
  return `<div class="empty">
    <div class="empty-icon"><i data-lucide="${icon}"></i></div>
    <div class="font-black text-ffnavy">${title}</div>
    <div class="text-sm mt-1">${copy}</div>
  </div>`;
}

function renderProjects(){
  const q = (document.getElementById("projectSearch")?.value || "").toLowerCase().trim();
  const filtered = projects.filter(p => [
    p.name,p.client,p.clientEmail,p.location,
    ...(p.services||[]).map(s=>s.name)
  ].join(" ").toLowerCase().includes(q));
  const grid = document.getElementById("projectsGrid");
  if(!filtered.length){
    grid.innerHTML = emptyState("folder-plus","No projects found", q ? "Try another search." : "Create your first project.");
    lucide.createIcons(); return;
  }
  grid.innerHTML = [...filtered].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(p=>{
    const n = projectNumbers(p);
    return `<article class="project-card">
      <div class="project-card-head">
        <span class="project-badge"><i data-lucide="calendar-days"></i>${formatDate(p.date)}</span>
        <span class="text-xs font-bold text-slate-400">${projectCrewAssignments(p).length} crew assignments</span>
      </div>
      <h4>${escapeHtml(p.name)}</h4>
      <div class="project-meta">${escapeHtml(p.client || p.location || "FrameFusion Studio Project")}</div>
      <div class="project-service-badges">
        ${(p.services||[]).map(s=>`<span>${escapeHtml(s.name)}</span>`).join("")}
      </div>
      <div class="project-money">
        <div><span>Revenue</span><strong>${money(p.revenue)}</strong></div>
        <div><span>Net Profit</span><strong class="${n.netProfit<0?'text-red-500':'text-green-600'}">${money(n.netProfit)}</strong></div>
      </div>
      <div class="project-actions">
        <button class="btn btn-primary flex-1" onclick="openReport('${p.id}')"><i data-lucide="file-text"></i>Report</button>
        <button class="icon-mini" title="Payments" onclick="openProjectPayments('${p.id}')"><i data-lucide="receipt-text"></i></button>
        <button class="icon-mini" title="Edit" onclick="editProject('${p.id}')"><i data-lucide="pencil"></i></button>
        <button class="icon-mini" title="Duplicate" onclick="duplicateProject('${p.id}')"><i data-lucide="copy"></i></button>
        <button class="icon-mini danger" title="Delete" onclick="deleteProject('${p.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </article>`;
  }).join("");
  lucide.createIcons();
}

function openProjectPayments(projectId){
  setView("payments");
  const eventSelect=document.getElementById("eventPaymentProject");
  const crewSelect=document.getElementById("crewPaymentProject");
  if(eventSelect){eventSelect.value=projectId;eventSelect.dispatchEvent(new Event("change"));}
  if(crewSelect){crewSelect.value=projectId;crewSelect.dispatchEvent(new Event("change"));}
}

function renderCrew(){
  const q = (document.getElementById("crewSearch")?.value || "").toLowerCase().trim();
  const filtered = crew.filter(c => [c.name,c.role,c.phone,c.email].join(" ").toLowerCase().includes(q));
  const wrap = document.getElementById("crewTableWrap");
  if(!filtered.length){
    wrap.innerHTML = emptyState("users","No crew members found",q ? "Try another search." : "Add your first crew member.");
    lucide.createIcons(); return;
  }
  wrap.innerHTML = `<table class="data-table">
    <thead><tr><th>Name</th><th>Role / Responsibility</th><th>Default Payment</th><th>Contact</th><th style="text-align:right">Actions</th></tr></thead>
    <tbody>
      ${filtered.map(c=>`<tr>
        <td><b class="text-ffnavy">${escapeHtml(c.name)}</b></td>
        <td><span class="role-pill">${escapeHtml(c.role)}</span></td>
        <td><b>${money(c.rate)}</b></td>
        <td><div>${escapeHtml(c.phone||"—")}</div><div class="text-xs text-slate-400">${escapeHtml(c.email||"")}</div></td>
        <td><div class="flex justify-end gap-2">
          <button class="icon-mini" onclick="editCrew('${c.id}')"><i data-lucide="pencil"></i></button>
          <button class="icon-mini danger" onclick="deleteCrew('${c.id}')"><i data-lucide="trash-2"></i></button>
        </div></td>
      </tr>`).join("")}
    </tbody>
  </table>`;
  lucide.createIcons();
}

function resetCrewForm(){
  document.getElementById("crewForm").reset();
  document.getElementById("crewId").value = "";
  document.getElementById("crewModalTitle").textContent = "Add Crew Member";
}
function newCrew(){
  if(!requirePermission(canManageCrew())) return;
  resetCrewForm(); openModal("crewModal");
}
function editCrew(id){
  if(!requirePermission(canManageCrew())) return;
  const c = crew.find(x=>x.id===id); if(!c) return;
  document.getElementById("crewId").value=c.id;
  document.getElementById("crewName").value=c.name||"";
  document.getElementById("crewRole").value=c.role||"";
  document.getElementById("crewRate").value=c.rate||0;
  document.getElementById("crewPhone").value=c.phone||"";
  document.getElementById("crewEmail").value=c.email||"";
  document.getElementById("crewNotes").value=c.notes||"";
  document.getElementById("crewModalTitle").textContent="Edit Crew Member";
  openModal("crewModal");
}
function deleteCrew(id){
  if(!requirePermission(canManageCrew())) return;
  const c=crew.find(x=>x.id===id); if(!c) return;
  if(!confirm(`Delete ${c.name} from the crew database? Existing projects will keep their saved copy.`)) return;
  crew=crew.filter(x=>x.id!==id); save(); renderCrew(); renderDashboard(); toast("Crew member deleted");
}

function resetProjectForm(){
  document.getElementById("projectForm").reset();
  document.getElementById("projectId").value="";
  document.getElementById("projectModalTitle").textContent="Create Project";
  document.getElementById("projectName").value="Match Live Coverage Budget";
  document.getElementById("projectSubtitle").value="Official Department Budget Breakdown & Crew Payment Allocation";
  document.getElementById("projectClientEmail").value="";
  document.getElementById("projectDirectorName").value="";
  document.getElementById("projectManagerName").value="";
  editingProjectServices=[];
  activeProjectServiceCrewId=null;
  renderProjectServiceBuilder();
  updateProjectCalcs();
}
function newProject(){
  if(!requirePermission(canManageProjects())) return;
  resetProjectForm();
  openModal("projectModal");
}
function editProject(id){
  if(!requirePermission(canManageProjects())) return;
  const p=projects.find(x=>x.id===id);
  if(!p) return;
  normalizeProjectServices(p);
  document.getElementById("projectId").value=p.id;
  document.getElementById("projectName").value=p.name||"";
  document.getElementById("projectDate").value=p.date||"";
  document.getElementById("projectClient").value=p.client||"";
  document.getElementById("projectClientEmail").value=p.clientEmail||"";
  document.getElementById("projectLocation").value=p.location||"";
  document.getElementById("projectRevenue").value=p.revenue||0;
  editingProjectServices=JSON.parse(JSON.stringify(p.services||[]));
  document.getElementById("projectSubtitle").value=p.subtitle||"";
  document.getElementById("projectDirectorName").value=p.directorName||"";
  document.getElementById("projectManagerName").value=p.managerName||"";
  document.getElementById("projectModalTitle").textContent="Edit Project";
  activeProjectServiceCrewId=null;
  renderProjectServiceBuilder();
  updateProjectCalcs();
  openModal("projectModal");
}
function duplicateProject(id){
  if(!requirePermission(canManageProjects())) return;
  const p=projects.find(x=>x.id===id);
  if(!p) return;
  const cp=JSON.parse(JSON.stringify(p));
  cp.id=uid("project");
  cp.name=`${p.name} (Copy)`;
  cp.eventPayments=[];
  cp.signatures={director:"",manager:""};
  cp.signatureRefs={director:"",manager:""};
  cp.services=(cp.services||[]).map(s=>({
    ...s,
    id:uid("service"),
    crew:(s.crew||[]).map(m=>({...m,payments:[]}))
  }));
  // Duplicated rental payments must not follow the copy.
  syncProjectLegacyTotals(cp);
  cp.createdAt=Date.now();
  cp.updatedAt=Date.now();
  projects.push(cp);
  save();
  renderProjects();
  renderDashboard();
  toast("Project duplicated");
}

function deleteProject(id){
  if(!requirePermission(canManageProjects())) return;
  const p=projects.find(x=>x.id===id); if(!p) return;
  if(!confirm(`Delete "${p.name}"?`)) return;
  projects=projects.filter(x=>x.id!==id); save(); renderProjects(); renderDashboard(); toast("Project deleted");
}


function renderProjectServicePresets(){
  const wrap=document.getElementById("projectServicePresets");
  if(!wrap) return;
  wrap.innerHTML=PROJECT_SERVICE_PRESETS.map(name=>{
    const selected=editingProjectServices.some(s=>s.name.toLowerCase()===name.toLowerCase());
    return `<button type="button" class="service-preset-btn ${selected?"selected":""}" onclick="toggleProjectServicePreset('${name.replace(/'/g,"\\'")}')">
      <i data-lucide="${selected?"check":"plus"}"></i>${escapeHtml(name)}
    </button>`;
  }).join("");
}
function currentEditingService(serviceId){
  return editingProjectServices.find(s=>s.id===serviceId)||null;
}
function editingProjectId(){
  return document.getElementById("projectId")?.value||"";
}
function editingServiceRentalPaid(serviceId){
  const pid=editingProjectId();
  return pid?projectServiceRentalPaid(pid,serviceId):0;
}
function serviceDepartmentMetrics(service){
  const revenue=Number(service?.budget||0);
  const production=Number(service?.productionCost||0);
  const target=Number(service?.targetProfit||0);
  const crewAllocated=serviceCrewAllocationTotal(service);
  const rentalIncluded=editingServiceRentalPaid(service?.id);
  const otherProduction=Math.max(0,production-rentalIncluded);
  const rentalOverrun=Math.max(0,rentalIncluded-production);
  const budgetProfit=revenue-production-crewAllocated;
  const targetDifference=budgetProfit-target;
  const crewBudgetForTarget=revenue-production-target;
  return {
    revenue,production,target,crewAllocated,rentalIncluded,otherProduction,
    rentalOverrun,budgetProfit,targetDifference,crewBudgetForTarget
  };
}
function serviceCrewRowsHtml(service){
  if(!(service.crew||[]).length){
    return `<div class="department-empty-crew">No crew assigned to ${escapeHtml(service.name)} yet.</div>`;
  }
  return service.crew.map((m,i)=>`
    <div class="department-crew-row">
      <div>
        <div class="project-crew-name">${escapeHtml(m.name)}</div>
        <div class="project-crew-role">Saved crew member</div>
      </div>
      <input value="${escapeHtml(m.role||"")}" oninput="updateDepartmentCrewRole('${service.id}',${i},this.value)" aria-label="Role" />
      <input type="number" min="0" step="1" inputmode="numeric" value="${Number(m.payment||0)}"
        oninput="updateDepartmentCrewPayment('${service.id}',${i},this.value)" aria-label="Payment" />
      <button type="button" class="remove-row" onclick="removeDepartmentCrew('${service.id}',${i})"><i data-lucide="x"></i></button>
    </div>`).join("");
}
function renderProjectServiceRows(){
  const wrap=document.getElementById("projectServicesList");
  if(!wrap) return;
  if(!editingProjectServices.length){
    wrap.innerHTML=`<div class="empty-service-budget">
      Select Live Production, Photography, Videography, After Movie or another service to create its separate department budget.
    </div>`;
  }else{
    wrap.innerHTML=editingProjectServices.map(s=>{
      const m=serviceDepartmentMetrics(s);
      return `
      <section class="department-budget-card" data-service-id="${s.id}">
        <div class="department-card-head">
          <div class="service-row-icon"><i data-lucide="layers-3"></i></div>
          <div class="department-title-input">
            <span>Service / Department</span>
            <input value="${escapeHtml(s.name)}" oninput="updateProjectServiceName('${s.id}',this.value)" />
          </div>
          <button type="button" class="remove-row" title="Remove department" onclick="removeProjectService('${s.id}')"><i data-lucide="trash-2"></i></button>
        </div>

        <div class="department-budget-fields">
          <label>
            <span>Revenue Allocation (LKR)</span>
            <input type="number" min="0" step="1" inputmode="numeric" value="${Number(s.budget||0)}"
              oninput="updateProjectServiceBudget('${s.id}',this.value)" />
          </label>
          <label>
            <span>Production Cost (LKR)</span>
            <input type="number" min="0" step="1" inputmode="numeric" value="${Number(s.productionCost||0)}"
              oninput="updateProjectServiceProductionCost('${s.id}',this.value)" />
            <small>Rental payments for this department are included inside this amount.</small>
          </label>
          <label>
            <span>Target Profit (LKR)</span>
            <input type="number" min="0" step="1" inputmode="numeric" value="${Number(s.targetProfit||0)}"
              oninput="updateProjectServiceTargetProfit('${s.id}',this.value)" />
          </label>
        </div>

        <div class="department-metrics">
          <div><span>Rental Included</span><strong data-metric="rental">${money(m.rentalIncluded)}</strong></div>
          <div><span>Other Production Cost</span><strong data-metric="other-production">${money(m.otherProduction)}</strong></div>
          <div><span>Crew Allocated</span><strong data-metric="crew">${money(m.crewAllocated)}</strong></div>
          <div><span>Budget Profit</span><strong data-metric="profit" class="${m.budgetProfit<0?"financial-negative":"financial-positive"}">${money(m.budgetProfit)}</strong></div>
          <div><span>Target Profit</span><strong data-metric="target">${money(m.target)}</strong></div>
          <div><span>Profit vs Target</span><strong data-metric="target-gap" class="${m.targetDifference<0?"financial-negative":"financial-positive"}">${money(m.targetDifference)}</strong></div>
        </div>

        <div class="department-budget-note ${m.rentalOverrun>0?"warning":""}" data-metric="note">
          ${m.rentalOverrun>0
            ? `Rental payments exceed this department's Production Cost by ${money(m.rentalOverrun)}. Increase Production Cost.`
            : `Crew budget available while keeping target profit: ${money(Math.max(0,m.crewBudgetForTarget))}`}
        </div>

        <div class="department-crew-head">
          <div>
            <h5>${escapeHtml(s.name)} Crew</h5>
            <p>Assign and budget crew specifically for this department.</p>
          </div>
          <button type="button" class="btn btn-light" onclick="openCrewPickerForService('${s.id}')">
            <i data-lucide="user-plus"></i>Add Crew
          </button>
        </div>
        <div class="department-crew-list">${serviceCrewRowsHtml(s)}</div>
      </section>`;
    }).join("");
  }
  renderProjectServicePresets();
  updateProjectServiceBudgetSummary();
  lucide.createIcons();
}
function renderProjectServiceBuilder(){
  renderProjectServiceRows();
}
function updateProjectServiceBudgetSummary(){
  const revenue=Number(document.getElementById("projectRevenue")?.value||0);
  const allocated=serviceBudgetsTotal(editingProjectServices);
  const difference=revenue-allocated;
  const set=(id,val)=>{const el=document.getElementById(id);if(el) el.textContent=money(val);};
  set("serviceProjectRevenue",revenue);
  set("serviceBudgetAllocated",allocated);
  set("serviceBudgetDifference",Math.abs(difference));
  const label=document.getElementById("serviceBudgetDifferenceLabel");
  const value=document.getElementById("serviceBudgetDifference");
  if(label) label.textContent=difference>=0?"Unallocated":"Overallocated";
  if(value){
    value.classList.toggle("financial-negative",difference!==0);
    value.classList.toggle("financial-positive",difference===0);
  }
}
function updateDepartmentCardMetrics(serviceId){
  const service=currentEditingService(serviceId);
  const card=[...document.querySelectorAll(".department-budget-card")].find(x=>x.dataset.serviceId===serviceId);
  if(!service||!card) return;
  const m=serviceDepartmentMetrics(service);
  const put=(metric,value,cls=null)=>{
    const el=card.querySelector(`[data-metric="${metric}"]`);
    if(!el) return;
    el.textContent=money(value);
    if(cls){
      el.classList.remove("financial-positive","financial-negative");
      el.classList.add(cls);
    }
  };
  put("rental",m.rentalIncluded);
  put("other-production",m.otherProduction);
  put("crew",m.crewAllocated);
  put("profit",m.budgetProfit,m.budgetProfit<0?"financial-negative":"financial-positive");
  put("target",m.target);
  put("target-gap",m.targetDifference,m.targetDifference<0?"financial-negative":"financial-positive");
  const note=card.querySelector('[data-metric="note"]');
  if(note){
    note.classList.toggle("warning",m.rentalOverrun>0);
    note.textContent=m.rentalOverrun>0
      ? `Rental payments exceed this department's Production Cost by ${money(m.rentalOverrun)}. Increase Production Cost.`
      : `Crew budget available while keeping target profit: ${money(Math.max(0,m.crewBudgetForTarget))}`;
  }
}
function toggleProjectServicePreset(name){
  const idx=editingProjectServices.findIndex(s=>s.name.toLowerCase()===String(name).toLowerCase());
  if(idx>=0){
    editingProjectServices.splice(idx,1);
  }else{
    const revenue=Number(document.getElementById("projectRevenue")?.value||0);
    const remaining=Math.max(0,revenue-serviceBudgetsTotal(editingProjectServices));
    editingProjectServices.push({
      id:uid("service"),
      name,
      budget:remaining,
      productionCost:0,
      targetProfit:0,
      crew:[]
    });
  }
  renderProjectServiceRows();
  updateProjectCalcs();
}
function addCustomProjectService(){
  const input=document.getElementById("customProjectServiceName");
  const name=String(input?.value||"").trim();
  if(!name){toast("Enter a custom service name");return;}
  if(editingProjectServices.some(s=>s.name.toLowerCase()===name.toLowerCase())){
    toast("This service is already selected");
    return;
  }
  const revenue=Number(document.getElementById("projectRevenue")?.value||0);
  const remaining=Math.max(0,revenue-serviceBudgetsTotal(editingProjectServices));
  editingProjectServices.push({
    id:uid("service"),name,budget:remaining,productionCost:0,targetProfit:0,crew:[]
  });
  input.value="";
  renderProjectServiceRows();
  updateProjectCalcs();
}
function updateProjectServiceName(serviceId,value){
  const s=currentEditingService(serviceId);
  if(!s) return;
  s.name=String(value||"");
  renderProjectServicePresets();
}
function updateProjectServiceBudget(serviceId,value){
  const s=currentEditingService(serviceId);
  if(!s) return;
  s.budget=Math.max(0,Number(value||0));
  updateDepartmentCardMetrics(serviceId);
  updateProjectCalcs();
}
function updateProjectServiceProductionCost(serviceId,value){
  const s=currentEditingService(serviceId);
  if(!s) return;
  s.productionCost=Math.max(0,Number(value||0));
  updateDepartmentCardMetrics(serviceId);
  updateProjectCalcs();
}
function updateProjectServiceTargetProfit(serviceId,value){
  const s=currentEditingService(serviceId);
  if(!s) return;
  s.targetProfit=Math.max(0,Number(value||0));
  updateDepartmentCardMetrics(serviceId);
  updateProjectCalcs();
}
function removeProjectService(serviceId){
  const s=currentEditingService(serviceId);
  if(!s) return;
  if((s.crew||[]).some(m=>(m.payments||[]).length)){
    toast("This department has saved crew payments. Remove those payments before deleting the department.");
    return;
  }
  editingProjectServices=editingProjectServices.filter(x=>x.id!==serviceId);
  renderProjectServiceRows();
  updateProjectCalcs();
}
function updateDepartmentCrewRole(serviceId,index,value){
  const s=currentEditingService(serviceId);
  if(!s?.crew?.[index]) return;
  s.crew[index].role=value;
}
function updateDepartmentCrewPayment(serviceId,index,value){
  const s=currentEditingService(serviceId);
  if(!s?.crew?.[index]) return;
  s.crew[index].payment=Math.max(0,Number(value||0));
  updateDepartmentCardMetrics(serviceId);
  updateProjectCalcs();
}
function removeDepartmentCrew(serviceId,index){
  const s=currentEditingService(serviceId);
  const member=s?.crew?.[index];
  if(!member) return;
  if((member.payments||[]).length){
    toast("This crew member has recorded payments in this department and cannot be removed.");
    return;
  }
  s.crew.splice(index,1);
  renderProjectServiceRows();
  updateProjectCalcs();
}
function openCrewPickerForService(serviceId){
  const s=currentEditingService(serviceId);
  if(!s) return;
  activeProjectServiceCrewId=serviceId;
  const title=document.getElementById("crewPickerModalTitle");
  if(title) title.textContent=`Select Crew for ${s.name}`;
  renderCrewPickerForActiveService();
  openModal("crewPickerModal");
  lucide.createIcons();
}
function renderCrewPickerForActiveService(){
  const list=document.getElementById("crewPickerList");
  const s=currentEditingService(activeProjectServiceCrewId);
  if(!list||!s) return;
  if(!crew.length){
    list.innerHTML=emptyState("user-plus","No saved crew","Add crew members first.");
    return;
  }
  list.innerHTML=crew.map(c=>{
    const selected=(s.crew||[]).some(x=>x.crewId===c.id);
    return `<button type="button" class="picker-item ${selected?"selected":""}" onclick="toggleCrewForActiveService('${c.id}')">
      <div class="text-left">
        <div class="picker-name">${escapeHtml(c.name)}</div>
        <div class="picker-role">${escapeHtml(c.role)} • ${money(c.rate)}</div>
      </div>
      <i data-lucide="${selected?"check-circle-2":"circle-plus"}"></i>
    </button>`;
  }).join("");
  lucide.createIcons();
}
function toggleCrewForActiveService(crewId){
  const s=currentEditingService(activeProjectServiceCrewId);
  if(!s) return;
  s.crew=s.crew||[];
  const idx=s.crew.findIndex(x=>x.crewId===crewId);
  if(idx>=0){
    if((s.crew[idx].payments||[]).length){
      toast("This crew member has saved payments in this department.");
      return;
    }
    s.crew.splice(idx,1);
  }else{
    const c=crew.find(x=>x.id===crewId);
    if(c){
      s.crew.push({
        crewId:c.id,name:c.name,role:c.role,email:c.email||"",
        payment:Number(c.rate||0),payments:[]
      });
    }
  }
  renderProjectServiceRows();
  renderCrewPickerForActiveService();
  updateProjectCalcs();
}
function updateProjectCalcs(){
  const revenue=Number(document.getElementById("projectRevenue")?.value||0);
  const productionCost=editingProjectServices.reduce((sum,s)=>sum+Number(s.productionCost||0),0);
  const crewTotal=editingProjectServices.reduce((sum,s)=>sum+serviceCrewAllocationTotal(s),0);
  const targetProfit=editingProjectServices.reduce((sum,s)=>sum+Number(s.targetProfit||0),0);
  const editingId=editingProjectId();
  const rentalPaid=editingId?projectRentalPaid(editingId):0;
  const profit=revenue-productionCost-crewTotal;
  const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=money(val);};
  set("calcProjectRevenue",revenue);
  set("calcProductionCost",productionCost);
  set("calcRentalIncluded",rentalPaid);
  set("calcCrew",crewTotal);
  set("calcTargetProfit",targetProfit);
  set("calcProfit",profit);
  updateProjectServiceBudgetSummary();
  editingProjectServices.forEach(s=>updateDepartmentCardMetrics(s.id));
  const el=document.getElementById("calcProfit");
  if(el){
    el.classList.remove("text-red-500","text-ffgreen");
    el.classList.add(profit<0?"text-red-500":"text-ffgreen");
  }
}

function todayInputValue(){
  const d=new Date();
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}
function normalizedEmail(v){
  return String(v||"").trim().toLowerCase();
}
function isEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim());
}
function eventPaymentsTotal(p){
  return (p?.eventPayments||[]).reduce((sum,x)=>sum+Number(x.amount||0),0);
}
function crewPaymentsTotal(member){
  return (member?.payments||[]).reduce((sum,x)=>sum+Number(x.amount||0),0);
}
function paymentStatus(totalDue,totalPaid){
  const due=Math.max(0,Number(totalDue||0));
  const paid=Math.max(0,Number(totalPaid||0));
  if(due>0 && paid>=due) return "PAID";
  if(paid>0) return "PARTIAL";
  return "UNPAID";
}
function statusPill(status){
  const safe=String(status||"UNPAID").toUpperCase();
  const cls=safe==="PAID"?"status-paid":safe==="PARTIAL"?"status-partial":"status-unpaid";
  return `<span class="status-pill ${cls}">${escapeHtml(safe)}</span>`;
}
function paymentReceiptNumber(type){
  const d=new Date();
  const yy=String(d.getFullYear()).slice(-2);
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const dd=String(d.getDate()).padStart(2,"0");
  const suffix=String(Date.now()).slice(-6);
  return `FF-${type==="crew"?"CRW":"EVT"}-${yy}${mm}${dd}-${suffix}`;
}
function receiptPartyLabel(receipt){
  return receipt.type==="crew" ? "Crew Member" : "Client / Event";
}
function receiptDirectionLabel(receipt){
  return receipt.type==="crew" ? "Payment Made" : "Payment Received";
}
function buildReceiptEmailHtml(receipt){
  const company=escapeHtml(appSettings.companyName||"FrameFusion Studio");
  const party=escapeHtml(receipt.partyName||"");
  const project=escapeHtml(receipt.projectName||"");
  const note=escapeHtml(receipt.note||"");
  const method=escapeHtml(receipt.method||"");
  const status=escapeHtml(receipt.status||"PAID");
  const direction=receiptDirectionLabel(receipt);
  const balance=Math.max(0,Number(receipt.balance||0));
  return `
  <div style="margin:0;background:#eef2f7;padding:24px;font-family:Arial,sans-serif;color:#172033">
    <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #dce3eb">
      <div style="background:#0f1b31;padding:24px 26px">
        <div style="font-size:24px;font-weight:900;color:#14a9e7">FrameFusion Studio</div>
        <div style="margin-top:5px;color:#fff;font-size:15px;font-weight:700">${escapeHtml(direction)} Receipt</div>
      </div>
      <div style="padding:24px 26px">
        <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:${status==="PAID"?"#dcfce7":"#fef3c7"};color:${status==="PAID"?"#15803d":"#a16207"};font-size:12px;font-weight:900">${status}</div>
        <h2 style="margin:18px 0 4px;font-size:22px;color:#0f1b31">${escapeHtml(receipt.receiptNo)}</h2>
        <p style="margin:0 0 20px;color:#748197;font-size:13px">${escapeHtml(receipt.date||"")}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:9px 0;color:#778499">Project / Event</td><td style="padding:9px 0;text-align:right;font-weight:700">${project}</td></tr>
          <tr><td style="padding:9px 0;color:#778499">${escapeHtml(receiptPartyLabel(receipt))}</td><td style="padding:9px 0;text-align:right;font-weight:700">${party}</td></tr>
          <tr><td style="padding:9px 0;color:#778499">Payment Method</td><td style="padding:9px 0;text-align:right;font-weight:700">${method}</td></tr>
          <tr><td style="padding:9px 0;color:#778499">Amount</td><td style="padding:9px 0;text-align:right;font-size:18px;font-weight:900;color:#0f1b31">${money(receipt.amount)}</td></tr>
          <tr><td style="padding:9px 0;color:#778499">Total Paid</td><td style="padding:9px 0;text-align:right;font-weight:800">${money(receipt.totalPaid)}</td></tr>
          <tr><td style="padding:9px 0;color:#778499">Balance</td><td style="padding:9px 0;text-align:right;font-weight:800">${money(balance)}</td></tr>
        </table>
        ${note?`<div style="margin-top:18px;padding:12px;border-radius:10px;background:#f7f9fc;color:#536176;font-size:13px"><b>Reference:</b> ${note}</div>`:""}
        <p style="margin:24px 0 0;color:#778499;font-size:12px;line-height:1.55">${escapeHtml(appSettings.footerText||"Thank you.")}</p>
      </div>
      <div style="padding:14px 26px;background:#f8fafc;color:#95a1b2;font-size:11px;text-align:center">${company} • Automated Payment Receipt</div>
    </div>
  </div>`;
}
function buildReceiptEmailText(receipt){
  return [
    `${appSettings.companyName||"FrameFusion Studio"} - ${receiptDirectionLabel(receipt)} Receipt`,
    `Receipt: ${receipt.receiptNo}`,
    `Status: ${receipt.status}`,
    `Project: ${receipt.projectName}`,
    `${receiptPartyLabel(receipt)}: ${receipt.partyName}`,
    `Date: ${receipt.date}`,
    `Method: ${receipt.method}`,
    `Amount: ${money(receipt.amount)}`,
    `Total Paid: ${money(receipt.totalPaid)}`,
    `Balance: ${money(Math.max(0,Number(receipt.balance||0)))}`,
    receipt.note ? `Reference: ${receipt.note}` : "",
    "",
    appSettings.footerText||"Thank you."
  ].filter(Boolean).join("\n");
}
async function queueReceiptEmail(receipt){
  if(!receipt?.email || !isEmail(receipt.email)){
    return {ok:false,error:"Valid recipient email is required."};
  }

  const params={
    to_email: receipt.email,
    receipt_no: receipt.receiptNo || "",
    status: receipt.status || "PAID",
    payment_date: receipt.date || todayInputValue(),
    project_name: receipt.projectName || "",
    person_name: receipt.partyName || "",
    payment_type: receipt.type==="crew" ? "Crew Payment" : "Event / Client Payment",
    payment_method: receipt.method || "",
    amount: Number(receipt.amount||0).toLocaleString("en-LK"),
    total_paid: Number(receipt.totalPaid||0).toLocaleString("en-LK"),
    balance: Math.max(0,Number(receipt.balance||0)).toLocaleString("en-LK"),
    note: receipt.note || "—"
  };

  try{
    const response=await fetch("https://api.emailjs.com/api/v1.0/email/send",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        service_id:EMAILJS_CONFIG.serviceId,
        template_id:EMAILJS_CONFIG.templateId,
        user_id:EMAILJS_CONFIG.publicKey,
        template_params:params
      })
    });

    if(!response.ok){
      const message=(await response.text()).trim() || `EmailJS error ${response.status}`;
      throw new Error(message);
    }

    receipt.emailSent=true;
    receipt.emailSentAt=Date.now();
    receipt.emailProvider="EmailJS";
    receipt.emailError="";
    receipt.emailQueued=false;
    receipt.mailId="";
    save();

    return {ok:true};
  }catch(error){
    console.error("EmailJS receipt send failed:",error);
    receipt.emailSent=false;
    receipt.emailProvider="EmailJS";
    receipt.emailError=error?.message||"Email send failed";
    save();
    return {ok:false,error:receipt.emailError};
  }
}
function receiptRecord(data){
  const item={
    id:uid("receipt"),
    receiptNo:paymentReceiptNumber(data.type),
    type:data.type,
    projectId:data.projectId,
    projectName:data.projectName,
    serviceId:data.serviceId||"",
    serviceName:data.serviceName||"",
    partyName:data.partyName,
    email:normalizedEmail(data.email),
    amount:Number(data.amount||0),
    date:data.date||todayInputValue(),
    method:data.method||"Bank Transfer",
    note:data.note||"",
    status:data.status||"PAID",
    totalDue:Number(data.totalDue||0),
    totalPaid:Number(data.totalPaid||0),
    balance:Number(data.balance||0),
    emailSent:false,
    emailSentAt:0,
    emailProvider:"EmailJS",
    emailQueued:false,
    mailId:"",
    emailError:"",
    createdAt:Date.now()
  };
  receipts.unshift(item);
  return item;
}
function findCrewEmail(member){
  const live=crew.find(c=>c.id===member?.crewId);
  return normalizedEmail(live?.email || member?.email || "");
}
function fillProjectSelect(selectId){
  const el=document.getElementById(selectId);
  if(!el) return;
  const current=el.value;
  if(!projects.length){
    el.innerHTML='<option value="">No projects available</option>';
    return;
  }
  el.innerHTML=projects
    .slice()
    .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))
    .map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  if(projects.some(p=>p.id===current)) el.value=current;
}
function loadReceiptSettingsForm(){
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value||""};
  set("receiptCompanyName",appSettings.companyName||"FrameFusion Studio");
  set("receiptSenderEmail","management.framefusion@gmail.com");
  set("receiptReplyToEmail","management.framefusion@gmail.com");
  set("receiptFooterText",appSettings.footerText||"");
}
function saveReceiptSettings(){
  appSettings={
    ...appSettings,
    id:"company",
    companyName:document.getElementById("receiptCompanyName").value.trim()||"FrameFusion Studio",
    senderEmail:"management.framefusion@gmail.com",
    replyToEmail:"management.framefusion@gmail.com",
    footerText:document.getElementById("receiptFooterText").value.trim()||"Thank you."
  };
  save();
  toast("Receipt email settings saved");
}
function renderEventPaymentSection(){
  const select=document.getElementById("eventPaymentProject");
  if(!select) return;
  fillProjectSelect("eventPaymentProject");
  const p=projects.find(x=>x.id===select.value) || projects[0];
  if(p && select.value!==p.id) select.value=p.id;

  const summary=document.getElementById("eventPaymentSummary");
  const history=document.getElementById("eventPaymentHistory");
  const email=document.getElementById("eventPaymentEmail");
  if(!p){
    summary.innerHTML=emptyState("folder-plus","No project","Create a project before recording payments.");
    history.innerHTML="";
    return;
  }
  const paid=eventPaymentsTotal(p);
  const balance=Math.max(0,Number(p.revenue||0)-paid);
  summary.innerHTML=`
    <div><span>Project Total</span><strong>${money(p.revenue)}</strong></div>
    <div><span>Received</span><strong class="paid-value">${money(paid)}</strong></div>
    <div><span>Balance</span><strong class="${balance>0?"balance-value":"paid-value"}">${money(balance)}</strong></div>`;
  if(email && (!email.value || email.dataset.projectId!==p.id)){
    email.value=p.clientEmail||"";
    email.dataset.projectId=p.id;
  }

  const items=(p.eventPayments||[]).slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  history.innerHTML=items.length ? `
    <div class="text-xs font-black text-ffnavy mb-2">Recent payments for this project</div>
    <div class="payment-history-list">
      ${items.slice(0,5).map(x=>`
        <div class="payment-history-item">
          <div>
            <div class="payment-history-title">${escapeHtml(x.receiptNo||"Payment")}</div>
            <div class="payment-history-meta">${escapeHtml(x.date||"")} • ${escapeHtml(x.method||"")} ${x.note?`• ${escapeHtml(x.note)}`:""}</div>
          </div>
          <div>
            <div class="payment-history-amount">${money(x.amount)}</div>
            <div class="mt-1 text-right">${statusPill(x.status||"PARTIAL")}</div>
          </div>
        </div>`).join("")}
    </div>` : `<div class="text-sm text-slate-400 mt-3">No event payments recorded yet.</div>`;
}
async function saveEventPayment(){
  if(!requirePermission(canManagePayments())) return;
  const projectId=document.getElementById("eventPaymentProject").value;
  const p=projects.find(x=>x.id===projectId);
  if(!p){toast("Select a project");return;}

  const amount=Number(document.getElementById("eventPaymentAmount").value||0);
  const date=document.getElementById("eventPaymentDate").value||todayInputValue();
  const method=document.getElementById("eventPaymentMethod").value||"Bank Transfer";
  const email=normalizedEmail(document.getElementById("eventPaymentEmail").value);
  const note=document.getElementById("eventPaymentNote").value.trim();

  if(amount<=0){toast("Enter the amount received");return;}
  if(!isEmail(email)){toast("Enter a valid client email");return;}

  const before=eventPaymentsTotal(p);
  const after=before+amount;
  const balance=Math.max(0,Number(p.revenue||0)-after);
  const status=paymentStatus(Number(p.revenue||0),after);

  const receipt=receiptRecord({
    type:"event",
    projectId:p.id,
    projectName:p.name,
    partyName:p.client||"Client",
    email,
    amount,
    date,
    method,
    note,
    status,
    totalDue:Number(p.revenue||0),
    totalPaid:after,
    balance
  });

  p.clientEmail=email;
  p.eventPayments=p.eventPayments||[];
  p.eventPayments.push({
    id:uid("eventpay"),
    receiptId:receipt.id,
    receiptNo:receipt.receiptNo,
    amount,
    date,
    method,
    email,
    note,
    status,
    createdAt:Date.now()
  });
  p.updatedAt=Date.now();
  save();

  document.getElementById("eventPaymentAmount").value="";
  document.getElementById("eventPaymentNote").value="";
  renderPayments();
  const result=await queueReceiptEmail(receipt);
  renderReceiptHistory();
  toast(result.ok ? `Payment saved. Receipt ${receipt.receiptNo} emailed.` : `Payment saved. ${result.error}`);
}
function renderCrewPayments(){
  const select=document.getElementById("crewPaymentProject");
  const list=document.getElementById("crewPaymentsList");
  if(!select||!list) return;
  fillProjectSelect("crewPaymentProject");
  const p=projects.find(x=>x.id===select.value)||projects[0];
  if(p && select.value!==p.id) select.value=p.id;
  if(!p){
    list.innerHTML=emptyState("users","No project","Create a project and assign department crew first.");
    return;
  }

  normalizeProjectServices(p);
  const departments=(p.services||[]).filter(s=>(s.crew||[]).length);
  if(!departments.length){
    list.innerHTML=emptyState("users","No assigned crew","Assign crew inside a Project Service / Department first.");
    return;
  }

  list.innerHTML=departments.map(s=>`
    <section class="crew-payment-department">
      <div class="crew-payment-department-head">
        <div>
          <div class="crew-payment-department-name">${escapeHtml(s.name)}</div>
          <div class="text-xs text-slate-400">
            Revenue ${money(s.budget)} • Crew Allocation ${money(serviceCrewAllocationTotal(s))}
          </div>
        </div>
        <span class="service-budget-pill">${(s.crew||[]).length} crew</span>
      </div>
      <div class="grid gap-3 mt-3">
        ${(s.crew||[]).map((m,index)=>{
          const due=Number(m.payment||0);
          const paid=crewPaymentsTotal(m);
          const balance=Math.max(0,due-paid);
          const status=paymentStatus(due,paid);
          const email=findCrewEmail(m);
          return `<div class="crew-payment-row">
            <div>
              <div class="crew-payment-name">${escapeHtml(m.name)}</div>
              <div class="crew-payment-role">${escapeHtml(m.role||"")}</div>
              <div class="crew-payment-email">${escapeHtml(email||"No email saved")}</div>
            </div>
            <div class="crew-payment-metric"><span>Due</span><strong>${money(due)}</strong></div>
            <div class="crew-payment-metric"><span>Paid</span><strong>${money(paid)}</strong></div>
            <div>${statusPill(status)}</div>
            <div class="crew-pay-action">
              <button class="btn ${balance<=0?"btn-light":"btn-primary"}" onclick="openCrewPayment('${p.id}','${s.id}',${index})">
                <i data-lucide="${balance<=0?"receipt-text":"badge-dollar-sign"}"></i>${balance<=0?"Add Payment":"Pay & Receipt"}
              </button>
            </div>
          </div>`;
        }).join("")}
      </div>
    </section>`).join("");
  lucide.createIcons();
}
function openCrewPayment(projectId,serviceId,index){
  const p=projects.find(x=>x.id===projectId);
  const s=(p?.services||[]).find(x=>x.id===serviceId);
  const m=s?.crew?.[index];
  if(!p||!s||!m) return;

  const due=Number(m.payment||0);
  const paid=crewPaymentsTotal(m);
  const balance=Math.max(0,due-paid);

  document.getElementById("crewPayProjectId").value=p.id;
  document.getElementById("crewPayServiceId").value=s.id;
  document.getElementById("crewPayMemberIndex").value=String(index);
  document.getElementById("crewPaymentModalTitle").textContent=`Pay ${m.name} — ${s.name}`;
  document.getElementById("crewPayAmount").value=balance>0?balance:due;
  document.getElementById("crewPayDate").value=todayInputValue();
  document.getElementById("crewPayMethod").value="Bank Transfer";
  document.getElementById("crewPayEmail").value=findCrewEmail(m);
  document.getElementById("crewPayNote").value="";
  document.getElementById("crewPaySummary").innerHTML=`
    <div><span>Department</span><strong>${escapeHtml(s.name)}</strong></div>
    <div><span>Allocated</span><strong>${money(due)}</strong></div>
    <div><span>Already Paid</span><strong class="paid-value">${money(paid)}</strong></div>
    <div><span>Balance</span><strong class="${balance>0?"balance-value":"paid-value"}">${money(balance)}</strong></div>`;
  openModal("crewPaymentModal");
  lucide.createIcons();
}
async function saveCrewPayment(){
  if(!requirePermission(canManagePayments())) return;
  const projectId=document.getElementById("crewPayProjectId").value;
  const serviceId=document.getElementById("crewPayServiceId").value;
  const index=Number(document.getElementById("crewPayMemberIndex").value);
  const p=projects.find(x=>x.id===projectId);
  const s=(p?.services||[]).find(x=>x.id===serviceId);
  const m=s?.crew?.[index];
  if(!p||!s||!m){
    toast("Department crew payment record not found");
    return;
  }

  const amount=Number(document.getElementById("crewPayAmount").value||0);
  const date=document.getElementById("crewPayDate").value||todayInputValue();
  const method=document.getElementById("crewPayMethod").value||"Bank Transfer";
  const email=normalizedEmail(document.getElementById("crewPayEmail").value);
  const note=document.getElementById("crewPayNote").value.trim();

  if(amount<=0){toast("Enter the amount paid");return;}
  if(!isEmail(email)){toast("Enter a valid crew email");return;}

  const due=Number(m.payment||0);
  const before=crewPaymentsTotal(m);
  const after=before+amount;
  const balance=Math.max(0,due-after);
  const status=paymentStatus(due,after);

  const receipt=receiptRecord({
    type:"crew",
    projectId:p.id,
    projectName:`${p.name} / ${s.name}`,
    serviceId:s.id,
    serviceName:s.name,
    partyName:m.name,
    email,
    amount,
    date,
    method,
    note:note||`${s.name} crew payment`,
    status,
    totalDue:due,
    totalPaid:after,
    balance
  });

  m.email=email;
  m.payments=m.payments||[];
  m.payments.push({
    id:uid("crewpay"),
    receiptId:receipt.id,
    receiptNo:receipt.receiptNo,
    amount,date,method,email,
    note:note||`${s.name} crew payment`,
    status,
    createdAt:Date.now()
  });

  const liveCrew=crew.find(c=>c.id===m.crewId);
  if(liveCrew && !liveCrew.email) liveCrew.email=email;

  syncProjectLegacyTotals(p);
  p.updatedAt=Date.now();
  save();
  closeModal("crewPaymentModal");
  renderPayments();
  renderCrew();
  renderFinancial();

  const result=await queueReceiptEmail(receipt);
  renderReceiptHistory();
  toast(result.ok
    ? `${m.name} / ${s.name} payment saved as ${status}. Receipt emailed.`
    : `Payment saved. ${result.error}`);
}

function renderReceiptHistory(){
  const wrap=document.getElementById("receiptHistory");
  if(!wrap) return;
  const list=receipts.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(!list.length){
    wrap.innerHTML=emptyState("receipt-text","No receipts yet","Payment receipts will appear here.");
    lucide.createIcons();
    return;
  }
  wrap.innerHTML=`<table class="data-table">
    <thead><tr><th>Receipt</th><th>Type</th><th>Project / Person</th><th>Amount</th><th>Status</th><th>Email</th><th style="text-align:right">Action</th></tr></thead>
    <tbody>${list.map(r=>`
      <tr>
        <td><b class="text-ffnavy">${escapeHtml(r.receiptNo||"")}</b><div class="text-xs text-slate-400">${escapeHtml(r.date||"")}</div></td>
        <td><span class="receipt-type">${r.type==="crew"?"Crew":"Event"}</span></td>
        <td><div class="font-bold">${escapeHtml(r.projectName||"")}</div><div class="text-xs text-slate-400">${escapeHtml(r.partyName||"")}</div></td>
        <td><b>${money(r.amount)}</b></td>
        <td>${statusPill(r.status)}</td>
        <td><div>${escapeHtml(r.email||"—")}</div><div class="receipt-email-state ${r.emailSent?"receipt-email-ok":"receipt-email-warn"}">${r.emailSent?"Sent by EmailJS":(r.emailError?"Email failed":"Not sent")}</div></td>
        <td><div class="flex justify-end">
          <button class="btn btn-light" onclick="resendReceipt('${r.id}')"><i data-lucide="send"></i>Resend</button>
        </div></td>
      </tr>`).join("")}</tbody>
  </table>`;
  lucide.createIcons();
}
async function resendReceipt(receiptId){
  const r=receipts.find(x=>x.id===receiptId);
  if(!r) return;
  const result=await queueReceiptEmail(r);
  renderReceiptHistory();
  toast(result.ok ? `Receipt ${r.receiptNo} emailed again` : result.error);
}
function renderPayments(){
  if(!document.getElementById("view-payments")) return;
  loadReceiptSettingsForm();
  fillProjectSelect("eventPaymentProject");
  fillProjectSelect("crewPaymentProject");
  const date=document.getElementById("eventPaymentDate");
  if(date && !date.value) date.value=todayInputValue();
  renderEventPaymentSection();
  renderCrewPayments();
  renderReceiptHistory();
}



function rentalStatus(total,paid){
  const t=Math.max(0,Number(total||0));
  const p=Math.max(0,Number(paid||0));
  if(t>0 && p>=t) return "PAID";
  if(p>0) return "PARTIAL";
  return "UNPAID";
}
function rentalPaymentsTotal(item){
  if(Array.isArray(item?.payments) && item.payments.length){
    return item.payments.reduce((sum,p)=>sum+Number(p.amount||0),0);
  }
  return Math.max(0,Number(item?.paidAmount||0));
}
function rentalPaymentCount(item){
  if(Array.isArray(item?.payments) && item.payments.length) return item.payments.length;
  return Number(item?.paidAmount||0)>0 ? 1 : 0;
}
function rentalBalance(item){
  return Math.max(0,Number(item.totalAmount||0)-rentalPaymentsTotal(item));
}
function rentalReceiptNo(){
  const d=new Date();
  const yy=String(d.getFullYear()).slice(-2);
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const dd=String(d.getDate()).padStart(2,"0");
  return `FF-RNT-${yy}${mm}${dd}-${String(Date.now()).slice(-6)}`;
}
function rentalProjectName(item){
  if(!item.projectId) return "General / No Project";
  const p=projects.find(x=>x.id===item.projectId);
  return p?.name || item.projectName || "Project";
}
function ensureRentalPayments(item){
  if(!item) return [];
  if(!Array.isArray(item.payments)) item.payments=[];
  if(!item.payments.length && Number(item.paidAmount||0)>0){
    item.payments.push({
      id:uid("rentalpay"),
      receiptNo:item.receiptNo||rentalReceiptNo(),
      amount:Number(item.paidAmount||0),
      date:item.paymentDate||todayInputValue(),
      method:item.paymentMethod||"Bank Transfer",
      email:item.supplierEmail||"",
      note:item.note||"",
      status:rentalStatus(item.totalAmount,item.paidAmount),
      emailSent:!!item.emailSent,
      emailSentAt:Number(item.emailSentAt||0),
      emailError:item.emailError||"",
      createdAt:Number(item.createdAt||Date.now())
    });
  }
  return item.payments;
}
function migrateRentalPaymentArrays(){
  let changed=false;
  rentals.forEach(item=>{
    const before=Array.isArray(item.payments)?item.payments.length:-1;
    ensureRentalPayments(item);
    const total=rentalPaymentsTotal(item);
    item.paidAmount=total;
    item.status=rentalStatus(item.totalAmount,total);
    if(before!==item.payments.length) changed=true;
  });
  if(changed) saveLocalCache();
}
function renderRentalProjectOptions(){
  const select=document.getElementById("rentalProjectId");
  if(!select) return;
  const current=select.value;
  select.innerHTML=`<option value="">General / No Project</option>`+
    [...projects]
      .sort((a,b)=>(a.name||"").localeCompare(b.name||""))
      .map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
      .join("");
  if([...select.options].some(o=>o.value===current)) select.value=current;
}
function renderRentalServiceOptions(){
  const projectSelect=document.getElementById("rentalProjectId");
  const serviceSelect=document.getElementById("rentalServiceId");
  if(!serviceSelect) return;
  const current=serviceSelect.value;
  const projectId=projectSelect?.value||"";
  const p=projects.find(x=>x.id===projectId);
  const services=p?.services||[];
  serviceSelect.innerHTML=`<option value="">Project-level / General Production</option>`+
    services.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  if([...serviceSelect.options].some(o=>o.value===current)) serviceSelect.value=current;
}
function rentalServiceName(item){
  if(!item?.serviceId) return item?.serviceName||"Project-level";
  const s=projectServiceById(item.projectId,item.serviceId);
  return s?.name || item.serviceName || "Project-level";
}

function renderRentalLiveSummary(){
  const wrap=document.getElementById("rentalLiveSummary");
  if(!wrap) return;
  const total=Number(document.getElementById("rentalTotalAmount")?.value||0);
  const paid=Number(document.getElementById("rentalPaidAmount")?.value||0);
  const balance=Math.max(0,total-paid);
  wrap.innerHTML=`
    <div><span>Total Rental Cost</span><strong>${money(total)}</strong></div>
    <div><span>Paid by FrameFusion</span><strong class="balance-value">${money(paid)}</strong></div>
    <div><span>Still Payable</span><strong class="${balance>0?"balance-value":"paid-value"}">${money(balance)}</strong></div>`;
}
function rentalEmailParams(item,payment){
  const totalPaid=rentalPaymentsTotal(item);
  const amount=Number(payment?.amount||0);
  return {
    to_email:payment?.email||item.supplierEmail,
    receipt_no:payment?.receiptNo||item.receiptNo||"",
    status:rentalStatus(item.totalAmount,totalPaid),
    payment_date:payment?.date||item.paymentDate||todayInputValue(),
    project_name:`${rentalProjectName(item)}${item.serviceId?` / ${rentalServiceName(item)}`:""} - ${item.itemName}`,
    person_name:item.supplierName,
    payment_type:"Rental Expense Payment",
    payment_method:payment?.method||item.paymentMethod||"Bank Transfer",
    amount:amount.toLocaleString("en-LK"),
    total_paid:totalPaid.toLocaleString("en-LK"),
    balance:rentalBalance(item).toLocaleString("en-LK"),
    note:[
      `Paid by FrameFusion Studio`,
      payment?.note||item.note||"",
      `Rented item/service: ${item.itemName}`,
      `Qty: ${Number(item.quantity||1)}`,
      item.startDate||item.endDate ? `Rental period: ${item.startDate||"—"} to ${item.endDate||"—"}` : "",
      Number(item.depositAmount||0)>0 ? `Refundable security deposit recorded separately: ${money(item.depositAmount)}` : ""
    ].filter(Boolean).join(" | ")
  };
}
async function sendRentalReceiptEmail(item,payment){
  const target=payment || ensureRentalPayments(item).slice(-1)[0];
  if(!target) return {ok:false,error:"Rental payment record not found."};
  const email=normalizedEmail(target.email||item.supplierEmail);
  if(!isEmail(email)) return {ok:false,error:"Valid supplier email is required."};
  target.email=email;
  item.supplierEmail=email;

  try{
    const response=await fetch("https://api.emailjs.com/api/v1.0/email/send",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        service_id:EMAILJS_CONFIG.serviceId,
        template_id:EMAILJS_CONFIG.templateId,
        user_id:EMAILJS_CONFIG.publicKey,
        template_params:rentalEmailParams(item,target)
      })
    });
    if(!response.ok){
      const message=(await response.text()).trim()||`EmailJS error ${response.status}`;
      throw new Error(message);
    }
    target.emailSent=true;
    target.emailSentAt=Date.now();
    target.emailError="";
    item.emailSent=true;
    item.emailSentAt=target.emailSentAt;
    item.emailError="";
    item.receiptNo=target.receiptNo;
    item.paymentDate=target.date;
    item.paymentMethod=target.method;
    item.updatedAt=Date.now();
    save();
    return {ok:true};
  }catch(error){
    console.error("Rental receipt email failed:",error);
    target.emailSent=false;
    target.emailError=error?.message||"Email send failed";
    item.emailSent=false;
    item.emailError=target.emailError;
    item.updatedAt=Date.now();
    save();
    return {ok:false,error:target.emailError};
  }
}
async function saveRentalPayment(){
  if(!requirePermission(canManagePayments())) return;
  const projectId=document.getElementById("rentalProjectId")?.value||"";
  const projectName=projectId?(projects.find(x=>x.id===projectId)?.name||""):"";
  const serviceId=document.getElementById("rentalServiceId")?.value||"";
  const serviceName=serviceId?(projectServiceById(projectId,serviceId)?.name||""):"";
  const supplierName=document.getElementById("rentalSupplierName").value.trim();
  const supplierEmail=normalizedEmail(document.getElementById("rentalSupplierEmail").value);
  const supplierPhone=document.getElementById("rentalSupplierPhone").value.trim();
  const itemName=document.getElementById("rentalItemName").value.trim();
  const quantity=Math.max(1,Number(document.getElementById("rentalQuantity").value||1));
  const totalAmount=Number(document.getElementById("rentalTotalAmount").value||0);
  const paidAmount=Number(document.getElementById("rentalPaidAmount").value||0);
  const paymentDate=document.getElementById("rentalPaymentDate").value||todayInputValue();
  const startDate=document.getElementById("rentalStartDate").value;
  const endDate=document.getElementById("rentalEndDate").value;
  const paymentMethod=document.getElementById("rentalPaymentMethod").value||"Bank Transfer";
  const depositAmount=Number(document.getElementById("rentalDepositAmount").value||0);
  const note=document.getElementById("rentalNote").value.trim();

  if(projectId && !serviceId){toast("Select the Related Service / Department for this rental");return;}
  if(!supplierName){toast("Enter rental supplier / owner name");return;}
  if(!isEmail(supplierEmail)){toast("Enter a valid supplier email");return;}
  if(!itemName){toast("Enter rented equipment / service");return;}
  if(totalAmount<=0){toast("Enter total rental cost");return;}
  if(paidAmount<=0){toast("Enter amount paid");return;}
  if(paidAmount>totalAmount){toast("Amount paid cannot be greater than total rental cost");return;}

  const receiptNo=rentalReceiptNo();
  const payment={
    id:uid("rentalpay"),
    receiptNo,
    amount:paidAmount,
    date:paymentDate,
    method:paymentMethod,
    email:supplierEmail,
    note,
    status:rentalStatus(totalAmount,paidAmount),
    emailSent:false,emailSentAt:0,emailError:"",
    createdAt:Date.now()
  };

  const item={
    id:uid("rental"),
    receiptNo,
    projectId,projectName,serviceId,serviceName,
    supplierName,supplierEmail,supplierPhone,
    itemName,quantity,totalAmount,paidAmount,
    paymentDate,startDate,endDate,paymentMethod,depositAmount,note,
    payments:[payment],
    status:rentalStatus(totalAmount,paidAmount),
    emailSent:false,emailSentAt:0,emailError:"",
    createdAt:Date.now(),updatedAt:Date.now()
  };

  rentals.unshift(item);
  save();
  renderRentals();
  renderFinancial();

  document.getElementById("rentalPaidAmount").value="";
  document.getElementById("rentalNote").value="";
  renderRentalLiveSummary();

  const result=await sendRentalReceiptEmail(item,payment);
  renderRentals();
  renderFinancial();
  toast(result.ok ? `Rental expense saved. Receipt ${payment.receiptNo} emailed.` : `Rental expense saved. ${result.error}`);
}
function openRentalBalancePayment(id){
  const item=rentals.find(x=>x.id===id);
  if(!item) return;
  ensureRentalPayments(item);

  const total=Number(item.totalAmount||0);
  const paid=rentalPaymentsTotal(item);
  const balance=Math.max(0,total-paid);

  if(balance<=0){
    toast("This rental is already fully paid");
    return;
  }

  document.getElementById("rentalBalanceRentalId").value=item.id;
  document.getElementById("rentalBalanceModalTitle").textContent=`Pay ${item.supplierName} Balance`;
  document.getElementById("rentalBalanceAmount").value=balance;
  document.getElementById("rentalBalanceDate").value=todayInputValue();
  document.getElementById("rentalBalanceMethod").value=item.paymentMethod||"Bank Transfer";
  document.getElementById("rentalBalanceEmail").value=item.supplierEmail||"";
  document.getElementById("rentalBalanceNote").value="";

  document.getElementById("rentalBalanceSummary").innerHTML=`
    <div><span>Total Rental Cost</span><strong>${money(total)}</strong></div>
    <div><span>Already Paid</span><strong class="paid-value">${money(paid)}</strong></div>
    <div><span>Balance</span><strong class="balance-value">${money(balance)}</strong></div>`;

  openModal("rentalBalanceModal");
  lucide.createIcons();
}
async function saveRentalBalancePayment(){
  if(!requirePermission(canManagePayments())) return;
  const id=document.getElementById("rentalBalanceRentalId").value;
  const item=rentals.find(x=>x.id===id);
  if(!item){toast("Rental record not found");return;}

  ensureRentalPayments(item);

  const amount=Number(document.getElementById("rentalBalanceAmount").value||0);
  const date=document.getElementById("rentalBalanceDate").value||todayInputValue();
  const method=document.getElementById("rentalBalanceMethod").value||"Bank Transfer";
  const email=normalizedEmail(document.getElementById("rentalBalanceEmail").value);
  const note=document.getElementById("rentalBalanceNote").value.trim();

  const before=rentalPaymentsTotal(item);
  const balanceBefore=Math.max(0,Number(item.totalAmount||0)-before);

  if(amount<=0){toast("Enter the amount paid");return;}
  if(amount>balanceBefore){toast(`Maximum balance is ${money(balanceBefore)}`);return;}
  if(!isEmail(email)){toast("Enter a valid supplier email");return;}

  const after=before+amount;
  const status=rentalStatus(item.totalAmount,after);
  const receiptNo=rentalReceiptNo();

  const payment={
    id:uid("rentalpay"),
    receiptNo,
    amount,
    date,
    method,
    email,
    note,
    status,
    emailSent:false,emailSentAt:0,emailError:"",
    createdAt:Date.now()
  };

  item.payments.push(payment);
  item.supplierEmail=email;
  item.paidAmount=after;
  item.status=status;
  item.receiptNo=receiptNo;
  item.paymentDate=date;
  item.paymentMethod=method;
  item.updatedAt=Date.now();

  save();
  closeModal("rentalBalanceModal");
  renderRentals();
  renderFinancial();

  const result=await sendRentalReceiptEmail(item,payment);
  renderRentals();
  renderFinancial();
  toast(result.ok
    ? `Balance payment saved as ${status}. Receipt ${receiptNo} emailed.`
    : `Balance payment saved. ${result.error}`);
}
async function resendRentalReceipt(id){
  const item=rentals.find(x=>x.id===id);
  if(!item) return;
  const payments=ensureRentalPayments(item);
  const latest=payments.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
  if(!latest){toast("No rental payment receipt found");return;}
  const result=await sendRentalReceiptEmail(item,latest);
  renderRentals();
  toast(result.ok ? `Receipt ${latest.receiptNo} emailed again` : result.error);
}
function deleteRental(id){
  const item=rentals.find(x=>x.id===id);
  if(!item) return;
  if(!confirm(`Delete rental expense ${item.supplierName} / ${item.itemName}?`)) return;
  rentals=rentals.filter(x=>x.id!==id);
  save();
  renderRentals();
  renderFinancial();
  toast("Rental expense deleted");
}
function renderRentalHistory(){
  const wrap=document.getElementById("rentalHistory");
  if(!wrap) return;

  const q=(document.getElementById("rentalSearch")?.value||"").trim().toLowerCase();
  const list=rentals.filter(r=>[
    r.receiptNo,r.supplierName,r.supplierEmail,r.supplierPhone,
    r.itemName,r.status,r.projectName,rentalProjectName(r),r.serviceName,rentalServiceName(r)
  ].join(" ").toLowerCase().includes(q));

  if(!list.length){
    wrap.innerHTML=emptyState("package-open","No rental expenses found",q?"Try another search.":"Record the first rental payment made by FrameFusion.");
    lucide.createIcons();
    return;
  }

  wrap.innerHTML=`<table class="data-table">
    <thead><tr>
      <th>Latest Receipt</th><th>Supplier / Owner</th><th>Project</th><th>Rented Item</th>
      <th>Paid</th><th>Still Payable</th><th>Status</th><th>Email</th><th style="text-align:right">Actions</th>
    </tr></thead>
    <tbody>${list.map(r=>{
      ensureRentalPayments(r);
      const paid=rentalPaymentsTotal(r);
      const balance=rentalBalance(r);
      const status=rentalStatus(r.totalAmount,paid);
      const paymentCount=rentalPaymentCount(r);
      const latest=[...(r.payments||[])].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
      return `
      <tr>
        <td>
          <b class="text-ffnavy">${escapeHtml(latest?.receiptNo||r.receiptNo||"")}</b>
          <div class="text-xs text-slate-400">${escapeHtml(latest?.date||r.paymentDate||"")}</div>
        </td>
        <td>
          <div class="font-bold">${escapeHtml(r.supplierName||"")}</div>
          <div class="text-xs text-slate-400">${escapeHtml(r.supplierEmail||"")}</div>
        </td>
        <td>
          <div>${escapeHtml(rentalProjectName(r))}</div>
          <div class="text-xs text-slate-400">${escapeHtml(rentalServiceName(r))}</div>
        </td>
        <td>
          <div>${escapeHtml(r.itemName)}</div>
          <div class="text-xs text-slate-400">Qty ${Number(r.quantity||1)}${r.startDate||r.endDate?` • ${escapeHtml(r.startDate||"—")} → ${escapeHtml(r.endDate||"—")}`:""}</div>
        </td>
        <td>
          <b>${money(paid)}</b>
          <div class="text-xs text-slate-400">${paymentCount} payment${paymentCount===1?"":"s"}</div>
        </td>
        <td><b class="${balance>0?"financial-negative":"financial-positive"}">${money(balance)}</b></td>
        <td>${statusPill(status)}</td>
        <td>
          <div class="receipt-email-state ${latest?.emailSent?"receipt-email-ok":"receipt-email-warn"}">${latest?.emailSent?"Sent by EmailJS":(latest?.emailError?"Email failed":"Not sent")}</div>
        </td>
        <td>
          <div class="rental-action-stack">
            ${balance>0?`
              <button class="btn btn-primary btn-compact" onclick="openRentalBalancePayment('${r.id}')">
                <i data-lucide="badge-dollar-sign"></i>Pay Balance
              </button>`:""}
            <button class="icon-mini" title="Resend latest receipt" onclick="resendRentalReceipt('${r.id}')"><i data-lucide="send"></i></button>
            <button class="icon-mini danger" title="Delete" onclick="deleteRental('${r.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;

  lucide.createIcons();
}
function renderRentals(){
  if(!document.getElementById("view-rentals")) return;
  migrateRentalPaymentArrays();
  renderRentalProjectOptions();
  renderRentalServiceOptions();
  const date=document.getElementById("rentalPaymentDate");
  if(date && !date.value) date.value=todayInputValue();
  renderRentalLiveSummary();
  renderRentalHistory();
}
function rentalPaidForProject(projectId){
  return projectRentalPaid(projectId);
}
function financialProjectRows(){
  return projects.map(p=>{
    normalizeProjectServices(p);
    const productionCost=projectProductionCostTotal(p);
    const crewAllocated=projectCrewAllocationTotal(p);
    const crewPaid=projectCrewPaidTotal(p);
    const targetProfit=projectTargetProfitTotal(p);
    const contractRevenue=Number(p.revenue||0);
    const revenueReceived=eventPaymentsTotal(p);
    const rentalPaid=projectRentalPaid(p.id);
    const budgetProfit=contractRevenue-productionCost-crewAllocated;
    const cashProfit=revenueReceived-productionCost-crewPaid;
    return {
      p,productionCost,crewAllocated,crewPaid,targetProfit,contractRevenue,
      revenueReceived,rentalPaid,budgetProfit,cashProfit
    };
  });
}
function financialCrewTotals(){
  const map=new Map();
  for(const p of projects){
    for(const s of (p.services||[])){
      for(const m of (s.crew||[])){
        const key=m.crewId||`${m.name}|${m.role}`;
        const paid=crewPaymentsTotal(m);
        if(!map.has(key)){
          map.set(key,{
            name:m.name||"Unknown",
            roles:new Set(),
            assignments:new Set(),
            allocated:0,
            paid:0
          });
        }
        const row=map.get(key);
        row.allocated+=Number(m.payment||0);
        row.paid+=paid;
        if(m.role) row.roles.add(m.role);
        row.assignments.add(`${p.name} / ${s.name}`);
      }
    }
  }
  return [...map.values()]
    .map(x=>({
      ...x,
      roles:[...x.roles],
      assignments:[...x.assignments]
    }))
    .sort((a,b)=>b.paid-a.paid);
}
function renderFinancialServiceTable(){
  const wrap=document.getElementById("financialServiceTable");
  if(!wrap) return;
  const rows=[];
  projects.forEach(p=>{
    normalizeProjectServices(p);
    (p.services||[]).forEach(s=>{
      const rentalPaid=projectServiceRentalPaid(p.id,s.id);
      const crewAllocated=serviceCrewAllocationTotal(s);
      const crewPaid=serviceCrewPaidTotal(s);
      const budgetProfit=serviceBudgetProfit(s);
      rows.push({
        project:p.name,
        service:s.name,
        budget:Number(s.budget||0),
        productionCost:Number(s.productionCost||0),
        rentalPaid,
        otherProduction:Math.max(0,Number(s.productionCost||0)-rentalPaid),
        crewAllocated,
        crewPaid,
        targetProfit:Number(s.targetProfit||0),
        budgetProfit,
        targetDifference:budgetProfit-Number(s.targetProfit||0)
      });
    });
  });

  if(!rows.length){
    wrap.innerHTML=emptyState("layers-3","No department budgets yet","Edit a project and create service / department budgets.");
    return;
  }

  wrap.innerHTML=`<table class="data-table department-financial-table">
    <thead><tr>
      <th>Project</th><th>Department</th><th>Revenue</th><th>Production Cost</th>
      <th>Rental Included</th><th>Other Production</th><th>Crew Allocated</th>
      <th>Crew Paid</th><th>Target Profit</th><th>Budget Profit</th><th>vs Target</th>
    </tr></thead>
    <tbody>${rows.map(r=>`
      <tr>
        <td><b class="text-ffnavy">${escapeHtml(r.project)}</b></td>
        <td><span class="service-budget-pill">${escapeHtml(r.service)}</span></td>
        <td>${money(r.budget)}</td>
        <td>${money(r.productionCost)}</td>
        <td>${money(r.rentalPaid)}</td>
        <td>${money(r.otherProduction)}</td>
        <td>${money(r.crewAllocated)}</td>
        <td>${money(r.crewPaid)}</td>
        <td>${money(r.targetProfit)}</td>
        <td><b class="${r.budgetProfit<0?"financial-negative":"financial-positive"}">${money(r.budgetProfit)}</b></td>
        <td><b class="${r.targetDifference<0?"financial-negative":"financial-positive"}">${money(r.targetDifference)}</b></td>
      </tr>`).join("")}</tbody>
  </table>`;
}
function renderFinancial(){
  const stats=document.getElementById("financialStats");
  if(!stats) return;

  migrateRentalPaymentArrays();
  migrateProjectServices();

  const rows=financialProjectRows();
  const contractRevenue=rows.reduce((s,x)=>s+x.contractRevenue,0);
  const incomeReceived=rows.reduce((s,x)=>s+x.revenueReceived,0);
  const productionCosts=rows.reduce((s,x)=>s+x.productionCost,0);
  const crewPaid=rows.reduce((s,x)=>s+x.crewPaid,0);
  const projectCashProfit=incomeReceived-productionCosts-crewPaid;

  const unassignedRentalPaid=rentals
    .filter(r=>!r.projectId)
    .reduce((s,r)=>s+rentalPaymentsTotal(r),0);
  const netCashProfit=projectCashProfit-unassignedRentalPaid;

  const data=[
    ["wallet",money(contractRevenue),"Contract Revenue"],
    ["circle-dollar-sign",money(incomeReceived),"Income Received"],
    ["wrench",money(productionCosts),"Production Costs"],
    ["users",money(crewPaid),"Crew Paid"],
    ["badge-dollar-sign",money(netCashProfit),netCashProfit>=0?"Cash Profit":"Cash Loss"]
  ];
  stats.innerHTML=data.map(([icon,value,label],i)=>`
    <div class="stat-card">
      <div class="stat-top"><span class="stat-icon"><i data-lucide="${icon}"></i></span></div>
      <div class="stat-value ${i===4?(netCashProfit>=0?"financial-positive":"financial-negative"):""}">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>`).join("");

  const projectsWrap=document.getElementById("financialProjectsTable");
  projectsWrap.innerHTML=rows.length?`<table class="data-table financial-project-v14">
    <thead><tr>
      <th>Project</th><th>Contract Revenue</th><th>Income Received</th><th>Production Cost</th>
      <th>Crew Allocated</th><th>Crew Paid</th><th>Target Profit</th><th>Budget Profit</th><th>Cash Profit / Loss</th>
    </tr></thead>
    <tbody>${rows.map(x=>`
      <tr>
        <td><b class="text-ffnavy">${escapeHtml(x.p.name)}</b></td>
        <td>${money(x.contractRevenue)}</td>
        <td>${money(x.revenueReceived)}</td>
        <td>${money(x.productionCost)}</td>
        <td>${money(x.crewAllocated)}</td>
        <td>${money(x.crewPaid)}</td>
        <td>${money(x.targetProfit)}</td>
        <td><b class="${x.budgetProfit<0?"financial-negative":"financial-positive"}">${money(x.budgetProfit)}</b></td>
        <td><b class="${x.cashProfit<0?"financial-negative":"financial-positive"}">${money(x.cashProfit)}</b></td>
      </tr>`).join("")}</tbody>
  </table>`:emptyState("folder-kanban","No project financials","Create projects and record payments first.");

  const rentalWrap=document.getElementById("financialRentalSummary");
  const totalRentalCost=rentals.reduce((s,r)=>s+Number(r.totalAmount||0),0);
  const amountPaid=rentals.reduce((s,r)=>s+rentalPaymentsTotal(r),0);
  const stillPayable=Math.max(0,totalRentalCost-amountPaid);
  const projectAssignedRental=rentals
    .filter(r=>r.projectId)
    .reduce((s,r)=>s+rentalPaymentsTotal(r),0);
  const serviceAssignedRental=rentals
    .filter(r=>r.projectId && r.serviceId)
    .reduce((s,r)=>s+rentalPaymentsTotal(r),0);
  const deposits=rentals.reduce((s,r)=>s+Number(r.depositAmount||0),0);

  rentalWrap.innerHTML=`<div class="financial-rental-card">
    <div class="financial-rental-line"><span>Total Rental Contracts</span><strong>${money(totalRentalCost)}</strong></div>
    <div class="financial-rental-line"><span>Paid to Suppliers</span><strong>${money(amountPaid)}</strong></div>
    <div class="financial-rental-line"><span>Still Payable</span><strong class="${stillPayable>0?"financial-negative":"financial-positive"}">${money(stillPayable)}</strong></div>
    <div class="financial-rental-line"><span>Assigned to Project Departments</span><strong class="financial-positive">${money(serviceAssignedRental)}</strong></div>
    <div class="financial-rental-line"><span>Project-linked but Department Unassigned</span><strong class="${projectAssignedRental-serviceAssignedRental>0?"financial-negative":""}">${money(projectAssignedRental-serviceAssignedRental)}</strong></div>
    <div class="financial-rental-line"><span>General / No Project Rental Paid</span><strong class="${unassignedRentalPaid>0?"financial-negative":""}">${money(unassignedRentalPaid)}</strong></div>
    <div class="financial-rental-note">
      Department-linked rental payments are already inside that department's Production Cost and are <b>not deducted again</b>.
    </div>
    <div class="financial-rental-line"><span>Refundable Security Deposits</span><strong>${money(deposits)}</strong></div>
  </div>`;

  renderFinancialServiceTable();

  const crewWrap=document.getElementById("financialCrewTable");
  const crewRows=financialCrewTotals();
  crewWrap.innerHTML=crewRows.length?`<table class="data-table">
    <thead><tr><th>Crew Member</th><th>Role(s)</th><th>Department Assignments</th><th>Total Allocated</th><th>Total Paid</th></tr></thead>
    <tbody>${crewRows.map(c=>`
      <tr>
        <td><b class="text-ffnavy">${escapeHtml(c.name)}</b></td>
        <td>${escapeHtml(c.roles.join(", ")||"—")}</td>
        <td><div>${c.assignments.length}</div><div class="text-xs text-slate-400">${escapeHtml(c.assignments.join(", "))}</div></td>
        <td><b>${money(c.allocated)}</b></td>
        <td><b>${money(c.paid)}</b></td>
      </tr>`).join("")}</tbody>
  </table>`:emptyState("users","No crew payments yet","Department crew payment totals will appear here.");
  lucide.createIcons();
}


function taskStatusLabel(status){
  return ({pending:"Pending",in_progress:"In Progress",done:"Done"})[status]||"Pending";
}
function taskStatusPill(status){
  const cls=status==="done"?"paid":status==="in_progress"?"partial":"unpaid";
  return `<span class="status-pill ${cls}">${escapeHtml(taskStatusLabel(status))}</span>`;
}
function taskPriorityPill(priority){
  const p=priority||"normal";
  return `<span class="task-priority ${p}">${escapeHtml(p.toUpperCase())}</span>`;
}
function isTaskOverdue(task){
  if(!task?.dueDate || task.status==="done") return false;
  return task.dueDate<todayInputValue();
}
function tasksForCurrentUser(list){
  return list||[];
}
function saveTasksLocal(){
  localStorage.setItem(STORAGE_KEYS.tasks,JSON.stringify(tasks));
}
async function persistTask(task){
  const payload=cleanForFirestore(task);
  delete payload.id;
  await setDoc(doc(db,CLOUD_COLLECTIONS.tasks,String(task.id)),payload);
  saveTasksLocal();
}
async function removeTaskCloud(id){
  await deleteDoc(doc(db,CLOUD_COLLECTIONS.tasks,String(id)));
  tasks=tasks.filter(t=>t.id!==id);
  saveTasksLocal();
}
function fillTaskProjectSelect(id,includeAll=false){
  const el=document.getElementById(id);
  if(!el) return;
  const current=el.value;
  el.innerHTML=(includeAll?`<option value="">All Projects</option>`:"")+
    projects.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  if([...el.options].some(o=>o.value===current)) el.value=current;
}
function fillTaskServiceSelect(projectId,elementId,includeAll=false){
  const el=document.getElementById(elementId);
  if(!el) return;
  const current=el.value;
  const p=projects.find(x=>x.id===projectId);
  const services=p?.services||[];
  el.innerHTML=(includeAll?`<option value="">All Departments</option>`:"")+
    services.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  if([...el.options].some(o=>o.value===current)) el.value=current;
}
function taskAssigneeOptions(projectId,serviceId,elementId,includeAll=false){
  const el=document.getElementById(elementId);
  if(!el) return;
  const current=el.value;
  const s=projectServiceById(projectId,serviceId);
  let members=s?.crew||crew;
  const seen=new Set();
  members=members.filter(m=>{
    const id=m.crewId||m.id;
    if(!id||seen.has(id)) return false;
    seen.add(id); return true;
  });
  el.innerHTML=(includeAll?`<option value="">All Assignees</option>`:`<option value="">Unassigned</option>`)+
    members.map(m=>{
      const id=m.crewId||m.id;
      return `<option value="${escapeHtml(id)}">${escapeHtml(m.name)}</option>`;
    }).join("");
  if([...el.options].some(o=>o.value===current)) el.value=current;
}
function syncTaskFormDependencies(){
  const projectId=document.getElementById("taskProjectId")?.value||"";
  fillTaskServiceSelect(projectId,"taskServiceId",false);
  const serviceId=document.getElementById("taskServiceId")?.value||"";
  taskAssigneeOptions(projectId,serviceId,"taskAssigneeCrewId",false);
}
function syncTaskFilterDependencies(){
  const projectId=document.getElementById("taskProjectFilter")?.value||"";
  fillTaskServiceSelect(projectId,"taskServiceFilter",true);
}
function newTask(){
  if(!requirePermission(canManageTasks())) return;
  if(!projects.length){toast("Create a project first");return;}
  document.getElementById("taskForm").reset();
  document.getElementById("taskId").value="";
  document.getElementById("taskModalTitle").textContent="New Task";
  fillTaskProjectSelect("taskProjectId",false);
  syncTaskFormDependencies();
  document.getElementById("taskStatus").value="pending";
  document.getElementById("taskPriority").value="normal";
  openModal("taskModal");
}
function editTask(id){
  if(!requirePermission(canManageTasks())) return;
  const t=tasks.find(x=>x.id===id);
  if(!t) return;
  document.getElementById("taskId").value=t.id;
  document.getElementById("taskModalTitle").textContent="Edit Task";
  fillTaskProjectSelect("taskProjectId",false);
  document.getElementById("taskProjectId").value=t.projectId||"";
  fillTaskServiceSelect(t.projectId,"taskServiceId",false);
  document.getElementById("taskServiceId").value=t.serviceId||"";
  taskAssigneeOptions(t.projectId,t.serviceId,"taskAssigneeCrewId",false);
  document.getElementById("taskAssigneeCrewId").value=t.assigneeCrewId||"";
  document.getElementById("taskTitle").value=t.title||"";
  document.getElementById("taskDueDate").value=t.dueDate||"";
  document.getElementById("taskPriority").value=t.priority||"normal";
  document.getElementById("taskStatus").value=t.status||"pending";
  document.getElementById("taskNotes").value=t.notes||"";
  openModal("taskModal");
}
async function saveTaskForm(){
  if(!requirePermission(canManageTasks())) return;
  const id=document.getElementById("taskId").value||uid("task");
  const projectId=document.getElementById("taskProjectId").value;
  const serviceId=document.getElementById("taskServiceId").value;
  const p=projects.find(x=>x.id===projectId);
  const s=projectServiceById(projectId,serviceId);
  if(!p||!s){toast("Select a project and department");return;}
  const assigneeCrewId=document.getElementById("taskAssigneeCrewId").value||"";
  const member=(s.crew||[]).find(m=>m.crewId===assigneeCrewId) || crew.find(c=>c.id===assigneeCrewId);
  const old=tasks.find(x=>x.id===id);
  const task={
    id,
    projectId,
    projectName:p.name,
    serviceId,
    serviceName:s.name,
    title:document.getElementById("taskTitle").value.trim(),
    assigneeCrewId,
    assigneeName:member?.name||"",
    dueDate:document.getElementById("taskDueDate").value||"",
    priority:document.getElementById("taskPriority").value||"normal",
    status:document.getElementById("taskStatus").value||"pending",
    notes:document.getElementById("taskNotes").value.trim(),
    createdByUid:old?.createdByUid||currentAuthUser?.uid||"",
    createdByName:old?.createdByName||currentUserProfile?.displayName||"",
    createdAt:old?.createdAt||Date.now(),
    updatedAt:Date.now()
  };
  if(!task.title){toast("Enter the task");return;}
  const idx=tasks.findIndex(x=>x.id===id);
  if(idx>=0) tasks[idx]=task; else tasks.unshift(task);
  try{
    await persistTask(task);
    closeModal("taskModal");
    renderTasks();
    renderDashboard();
    toast(old?"Task updated":"Task added");
  }catch(error){
    console.error(error);
    toast("Task could not be saved to Firestore");
  }
}
async function setTaskStatus(id,status){
  const t=tasks.find(x=>x.id===id);
  if(!t) return;
  if(!canManageTasks()){
    toast("Only Admin, Director or Manager can update task status");
    return;
  }
  t.status=status;
  t.updatedAt=Date.now();
  try{
    await persistTask(t);
    renderTasks();
    renderDashboard();
  }catch(error){
    console.error(error);
    toast("Task status update failed");
  }
}
async function deleteTaskItem(id){
  if(!requirePermission(canManageTasks())) return;
  const t=tasks.find(x=>x.id===id);
  if(!t) return;
  if(!confirm(`Delete task "${t.title}"?`)) return;
  try{
    await removeTaskCloud(id);
    renderTasks();
    renderDashboard();
    toast("Task deleted");
  }catch(error){
    console.error(error);
    toast("Task delete failed");
  }
}
function taskFilterList(){
  let list=tasksForCurrentUser(tasks);
  const projectId=document.getElementById("taskProjectFilter")?.value||"";
  const serviceId=document.getElementById("taskServiceFilter")?.value||"";
  const status=document.getElementById("taskStatusFilter")?.value||"";
  const assignee=document.getElementById("taskAssigneeFilter")?.value||"";
  const q=(document.getElementById("taskSearch")?.value||"").trim().toLowerCase();
  if(projectId) list=list.filter(t=>t.projectId===projectId);
  if(serviceId) list=list.filter(t=>t.serviceId===serviceId);
  if(status) list=list.filter(t=>t.status===status);
  if(assignee) list=list.filter(t=>t.assigneeCrewId===assignee);
  if(q) list=list.filter(t=>[
    t.title,t.projectName,t.serviceName,t.assigneeName,t.notes
  ].join(" ").toLowerCase().includes(q));
  return list.sort((a,b)=>{
    if(a.status==="done" && b.status!=="done") return 1;
    if(a.status!=="done" && b.status==="done") return -1;
    return String(a.dueDate||"9999").localeCompare(String(b.dueDate||"9999")) || (b.updatedAt||0)-(a.updatedAt||0);
  });
}
function renderTaskStats(){
  const wrap=document.getElementById("taskStats");
  if(!wrap) return;
  const list=tasksForCurrentUser(tasks);
  const stats=[
    ["list-todo",list.filter(t=>t.status==="pending").length,"Pending"],
    ["loader-circle",list.filter(t=>t.status==="in_progress").length,"In Progress"],
    ["check-circle-2",list.filter(t=>t.status==="done").length,"Done"],
    ["triangle-alert",list.filter(isTaskOverdue).length,"Overdue"]
  ];
  wrap.innerHTML=stats.map(([icon,val,label])=>`
    <div class="stat-card">
      <div class="stat-top"><span class="stat-icon"><i data-lucide="${icon}"></i></span></div>
      <div class="stat-value">${val}</div>
      <div class="stat-label">${label}</div>
    </div>`).join("");
}
function renderTasks(){
  const wrap=document.getElementById("tasksList");
  if(!wrap) return;
  renderTaskStats();
  fillTaskProjectSelect("taskProjectFilter",true);
  const projectFilter=document.getElementById("taskProjectFilter")?.value||"";
  fillTaskServiceSelect(projectFilter,"taskServiceFilter",true);
  taskAssigneeOptions("","","taskAssigneeFilter",true);

  const list=taskFilterList();
  if(!list.length){
    wrap.innerHTML=emptyState("list-checks","No tasks found","Add a task or generate a department checklist.");
    lucide.createIcons();
    return;
  }

  wrap.innerHTML=list.map(t=>`
    <article class="task-card ${t.status==="done"?"task-done":""} ${isTaskOverdue(t)?"task-overdue":""}">
      <button class="task-check-btn" title="Toggle status" onclick="setTaskStatus('${t.id}','${t.status==="done"?"pending":"done"}')">
        <i data-lucide="${t.status==="done"?"check-circle-2":"circle"}"></i>
      </button>
      <div class="task-card-main">
        <div class="task-card-top">
          <div>
            <h4>${escapeHtml(t.title)}</h4>
            <p>${escapeHtml(t.projectName)} <span>•</span> ${escapeHtml(t.serviceName)}</p>
          </div>
          <div class="task-badges">
            ${taskPriorityPill(t.priority)}
            ${taskStatusPill(t.status)}
          </div>
        </div>
        <div class="task-meta">
          <span><i data-lucide="user-round"></i>${escapeHtml(t.assigneeName||"Unassigned")}</span>
          <span class="${isTaskOverdue(t)?"financial-negative":""}"><i data-lucide="calendar-days"></i>${t.dueDate?formatDate(t.dueDate):"No due date"}</span>
          ${t.notes?`<span><i data-lucide="notebook-pen"></i>${escapeHtml(t.notes)}</span>`:""}
        </div>
        ${t.status!=="done"?`<div class="task-progress-actions">
          <button onclick="setTaskStatus('${t.id}','pending')" class="${t.status==="pending"?"active":""}">Pending</button>
          <button onclick="setTaskStatus('${t.id}','in_progress')" class="${t.status==="in_progress"?"active":""}">In Progress</button>
          <button onclick="setTaskStatus('${t.id}','done')">Done</button>
        </div>`:""}
      </div>
      ${canManageTasks()?`<div class="task-admin-actions">
        <button class="icon-mini" onclick="editTask('${t.id}')"><i data-lucide="pencil"></i></button>
        <button class="icon-mini danger" onclick="deleteTaskItem('${t.id}')"><i data-lucide="trash-2"></i></button>
      </div>`:""}
    </article>`).join("");
  lucide.createIcons();
}
async function generateProjectChecklist(){
  if(!requirePermission(canManageTasks())) return;
  const projectId=document.getElementById("taskProjectFilter")?.value||projects[0]?.id||"";
  const p=projects.find(x=>x.id===projectId);
  if(!p){toast("Select a project in the task filter first");return;}
  const items=[];
  for(const s of (p.services||[])){
    const templates=TASK_TEMPLATES[s.name]||[
      `${s.name} pre-production checklist confirmed`,
      `${s.name} equipment / resources checked`,
      `${s.name} execution readiness confirmed`,
      `${s.name} final delivery / handover checked`
    ];
    const defaultAssignee=(s.crew||[])[0];
    templates.forEach(title=>{
      const exists=tasks.some(t=>t.projectId===p.id && t.serviceId===s.id && t.title.toLowerCase()===title.toLowerCase());
      if(exists) return;
      items.push({
        id:uid("task"),
        projectId:p.id,
        projectName:p.name,
        serviceId:s.id,
        serviceName:s.name,
        title,
        assigneeCrewId:defaultAssignee?.crewId||"",
        assigneeName:defaultAssignee?.name||"",
        dueDate:p.date||"",
        priority:"normal",
        status:"pending",
        notes:"",
        createdByUid:currentAuthUser?.uid||"",
        createdByName:currentUserProfile?.displayName||"",
        createdAt:Date.now(),
        updatedAt:Date.now()
      });
    });
  }
  if(!items.length){toast("Checklist already exists for this project");return;}
  try{
    await Promise.all(items.map(persistTask));
    tasks.unshift(...items);
    saveTasksLocal();
    renderTasks();
    renderDashboard();
    toast(`${items.length} checklist tasks generated`);
  }catch(error){
    console.error(error);
    toast("Checklist generation failed");
  }
}

async function loadUserProfiles(){
  if(!isAdmin()) return;
  try{
    userProfiles=await readCloudCollection(CLOUD_COLLECTIONS.users);
    renderUsers();
  }catch(error){
    console.error(error);
  }
}
function renderUsers(){
  const wrap=document.getElementById("usersTable");
  if(!wrap) return;
  if(!isAdmin()){
    wrap.innerHTML=emptyState("shield-ban","Admin only","User management is available only to Admin accounts.");
    return;
  }
  if(!userProfiles.length){
    wrap.innerHTML=emptyState("user-plus","No user profiles","Create the first management username.");
    lucide.createIcons();
    return;
  }
  wrap.innerHTML=`<table class="data-table">
    <thead><tr><th>Username</th><th>Role</th><th>Linked Crew</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
    <tbody>${userProfiles.sort((a,b)=>(a.username||a.displayName||"").localeCompare(b.username||b.displayName||"")).map(u=>{
      const linked=crew.find(c=>c.id===u.crewId);
      const self=u.id===currentAuthUser?.uid;
      return `<tr>
        <td><b class="text-ffnavy">${escapeHtml(u.username||u.displayName||"User")}</b>${self?` <span class="you-pill">YOU</span>`:""}</td>
        <td><span class="role-access-pill role-${escapeHtml(u.role||"manager")}">${escapeHtml(roleName(u.role))}</span></td>
        <td>${escapeHtml(linked?.name||"—")}</td>
        <td><span class="status-pill ${u.active===false?"unpaid":"paid"}">${u.active===false?"DISABLED":"ACTIVE"}</span></td>
        <td><div class="flex justify-end gap-2">
          ${!self?`<button class="btn btn-compact ${u.active===false?"btn-primary":"btn-light"}" onclick="toggleUserActive('${u.id}',${u.active===false?"true":"false"})">${u.active===false?"Enable":"Disable"}</button>`:""}
        </div></td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
  lucide.createIcons();
}
function openNewUser(){
  if(!requirePermission(isAdmin(),"Admin access required.")) return;
  document.getElementById("userForm").reset();
  const select=document.getElementById("userCrewId");
  select.innerHTML=`<option value="">Not linked</option>`+
    crew.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} — ${escapeHtml(c.role)}</option>`).join("");
  openModal("userModal");
}
function getSecondaryUserAuth(){
  if(secondaryUserAuth) return secondaryUserAuth;
  const secondaryApp=initializeApp(firebaseConfig,"FrameFusionUserAdmin");
  secondaryUserAuth=getAuth(secondaryApp);
  return secondaryUserAuth;
}
async function createStaffUser(){
  if(!requirePermission(isAdmin(),"Admin access required.")) return;
  const username=normalizeUsername(document.getElementById("userUsername").value);
  const password=document.getElementById("userPassword").value;
  const role=document.getElementById("userRole").value;
  const crewId=document.getElementById("userCrewId").value||"";
  const allowedRoles=["admin","director","manager","accountant"];

  if(!isValidUsername(username)){
    toast("Username must be 3–32 characters");
    return;
  }
  if(password.length<6){
    toast("Password must contain at least 6 characters");
    return;
  }
  if(!allowedRoles.includes(role)){
    toast("Only management roles can receive app logins");
    return;
  }

  const authEmail=authEmailFromUsername(username);
  try{
    const secAuth=getSecondaryUserAuth();
    const cred=await createUserWithEmailAndPassword(secAuth,authEmail,password);
    const uidValue=cred.user.uid;
    await setDoc(doc(db,CLOUD_COLLECTIONS.users,uidValue),{
      uid:uidValue,
      username,
      displayName:username,
      role,
      crewId,
      active:true,
      createdAt:Date.now(),
      updatedAt:Date.now(),
      createdBy:currentAuthUser?.uid||""
    });
    await signOut(secAuth);
    closeModal("userModal");
    await loadUserProfiles();
    toast(`Username "${username}" created`);
  }catch(error){
    console.error(error);
    toast(error?.code==="auth/email-already-in-use"
      ?"That username is already in use."
      :"User account could not be created");
  }
}
async function toggleUserActive(uidValue,active){
  if(!requirePermission(isAdmin())) return;
  const profile=userProfiles.find(u=>u.id===uidValue);
  if(!profile) return;
  try{
    await setDoc(doc(db,CLOUD_COLLECTIONS.users,uidValue),{
      ...cleanForFirestore(profile),active:!!active,updatedAt:Date.now()
    });
    await loadUserProfiles();
    toast(active?"User enabled":"User disabled");
  }catch(error){
    console.error(error);toast("User status update failed");
  }
}
function projectSignatures(p){
  const s=p?.signatures||{};
  return {
    director: typeof s.director==="string" ? s.director : "",
    manager: typeof s.manager==="string" ? s.manager : ""
  };
}
function signatureRoleLabel(role){
  return role==="manager" ? "Manager" : "Director";
}
function signerNameForRole(p,role){
  const value=role==="manager" ? p?.managerName : p?.directorName;
  return String(value||"").trim() || signatureRoleLabel(role);
}
function signatureCardHtml(p,role){
  const signatures=projectSignatures(p);
  const value=signatures[role]||"";
  const roleLabel=signatureRoleLabel(role);
  const signerName=signerNameForRole(p,role);
  return `
    <div class="report-signature-card" role="button" tabindex="0"
         onclick="openSignaturePad('${role}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openSignaturePad('${role}')}"
         aria-label="${escapeHtml(roleLabel)} signature">
      ${value
        ? `<img class="report-signature-image" src="${value}" alt="${escapeHtml(roleLabel)} signature" />`
        : `<div class="report-signature-empty">Tap to Sign</div>`}
      <div class="report-signature-line">
        <div class="report-signature-name">${escapeHtml(signerName)}</div>
        <div class="report-signature-role">${escapeHtml(roleLabel)}</div>
        <div class="report-signature-hint">${value ? "Tap to replace / choose saved signature" : "Tap here to sign / choose saved signature"}</div>
      </div>
    </div>`;
}
function matchingSignatureLibrary(role){
  const sameRole=signatureLibrary.filter(sig=>sig.role===role);
  return (sameRole.length ? sameRole : signatureLibrary)
    .slice()
    .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
}
function renderSignatureLibraryPicker(){
  const select=document.getElementById("signatureLibrarySelect");
  const button=document.getElementById("useSavedSignatureBtn");
  const hint=document.getElementById("signatureLibraryHint");
  if(!select||!button) return;
  const list=matchingSignatureLibrary(activeSignatureRole);
  if(!list.length){
    select.innerHTML='<option value="">No saved signatures yet</option>';
    select.disabled=true;
    button.disabled=true;
    if(hint) hint.textContent="Draw and save once. It will appear here next time.";
    return;
  }
  select.disabled=false;
  button.disabled=false;
  select.innerHTML='<option value="">Choose a saved signature...</option>'+
    list.map(sig=>`<option value="${escapeHtml(sig.id)}">${escapeHtml(sig.name||signatureRoleLabel(sig.role))} — ${escapeHtml(signatureRoleLabel(sig.role))}</option>`).join("");
  if(hint) hint.textContent=`${list.length} saved signature${list.length===1?"":"s"} available from Firestore.`;
}
function findReusableSignature(role,personName){
  const normalized=String(personName||"").trim().toLowerCase();
  return signatureLibrary.find(sig=>
    sig.role===role && String(sig.name||"").trim().toLowerCase()===normalized
  ) || null;
}
function saveSignatureToLibrary(role,personName,imageData){
  const safeName=String(personName||"").trim() || signatureRoleLabel(role);
  let item=findReusableSignature(role,safeName);
  if(item){
    item.imageData=imageData;
    item.updatedAt=Date.now();
  }else{
    item={
      id:uid("signature"),
      role,
      name:safeName,
      imageData,
      createdAt:Date.now(),
      updatedAt:Date.now()
    };
    signatureLibrary.push(item);
  }
  return item;
}
function useSelectedSignature(){
  const p=projects.find(x=>x.id===activeReportProjectId);
  const select=document.getElementById("signatureLibrarySelect");
  if(!p||!activeSignatureRole||!select?.value) return;
  const savedSig=signatureLibrary.find(sig=>sig.id===select.value);
  if(!savedSig||!savedSig.imageData){
    toast("Saved signature not found");
    return;
  }
  p.signatures={...(p.signatures||{}),[activeSignatureRole]:savedSig.imageData};
  p.signatureRefs={...(p.signatureRefs||{}),[activeSignatureRole]:savedSig.id};
  if(activeSignatureRole==="director" && !String(p.directorName||"").trim()) p.directorName=savedSig.name||"";
  if(activeSignatureRole==="manager" && !String(p.managerName||"").trim()) p.managerName=savedSig.name||"";
  p.updatedAt=Date.now();
  save();
  const label=signatureRoleLabel(activeSignatureRole);
  closeSignaturePad();
  document.getElementById("reportPaper").innerHTML=reportHtml(p);
  renderProjects();
  renderDashboard();
  toast(`${label} saved signature applied`);
}
function openSignaturePad(role){
  const p=projects.find(x=>x.id===activeReportProjectId);
  if(!p) return;
  activeSignatureRole=role==="manager" ? "manager" : "director";
  const modal=document.getElementById("signatureModal");
  const title=document.getElementById("signatureTitle");
  if(title) title.textContent=`${signatureRoleLabel(activeSignatureRole)} Signature`;
  const saveBtn=document.getElementById("signatureSaveBtn");
  if(saveBtn) saveBtn.innerHTML='<i data-lucide="check"></i> Save Signature';
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("signature-open");
  renderSignatureLibraryPicker();
  requestAnimationFrame(()=>{
    setupSignatureCanvas();
    lucide.createIcons();
  });
}
function closeSignaturePad(){
  const modal=document.getElementById("signatureModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("signature-open");
  activeSignatureRole=null;
  signaturePadDrawing=false;
  signaturePadLastPoint=null;
}
function setupSignatureCanvas(){
  const canvas=document.getElementById("signatureCanvas");
  const wrap=canvas.parentElement;
  const rect=wrap.getBoundingClientRect();
  const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,3));
  canvas.width=Math.max(1,Math.floor(rect.width*dpr));
  canvas.height=Math.max(1,Math.floor(rect.height*dpr));
  const ctx=canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,rect.width,rect.height);
  ctx.lineCap="round";
  ctx.lineJoin="round";
  ctx.strokeStyle="#111827";
  ctx.lineWidth=3.2;
  signaturePadHasInk=false;
  signaturePadDrawing=false;
  signaturePadLastPoint=null;

  const p=projects.find(x=>x.id===activeReportProjectId);
  const existing=projectSignatures(p)[activeSignatureRole]||"";
  if(existing){
    const img=new Image();
    img.onload=()=>{
      const padding=24;
      const maxW=Math.max(10,rect.width-padding*2);
      const maxH=Math.max(10,rect.height-padding*2);
      const ratio=Math.min(maxW/img.width,maxH/img.height);
      const dw=img.width*ratio,dh=img.height*ratio;
      ctx.drawImage(img,(rect.width-dw)/2,(rect.height-dh)/2,dw,dh);
      signaturePadHasInk=true;
    };
    img.src=existing;
  }
}
function signatureCanvasPoint(event){
  const canvas=document.getElementById("signatureCanvas");
  const rect=canvas.getBoundingClientRect();
  return {x:event.clientX-rect.left,y:event.clientY-rect.top};
}
function signaturePointerDown(event){
  if(event.pointerType==="mouse" && event.button!==0) return;
  const canvas=document.getElementById("signatureCanvas");
  try{canvas.setPointerCapture(event.pointerId);}catch(e){}
  signaturePadDrawing=true;
  signaturePadLastPoint=signatureCanvasPoint(event);
  event.preventDefault();
}
function signaturePointerMove(event){
  if(!signaturePadDrawing||!signaturePadLastPoint) return;
  const canvas=document.getElementById("signatureCanvas");
  const ctx=canvas.getContext("2d");
  const p=signatureCanvasPoint(event);
  ctx.beginPath();
  ctx.moveTo(signaturePadLastPoint.x,signaturePadLastPoint.y);
  ctx.lineTo(p.x,p.y);
  ctx.stroke();
  signaturePadLastPoint=p;
  signaturePadHasInk=true;
  event.preventDefault();
}
function signaturePointerUp(event){
  signaturePadDrawing=false;
  signaturePadLastPoint=null;
  event.preventDefault();
}
function clearSignatureCanvas(){
  const canvas=document.getElementById("signatureCanvas");
  const rect=canvas.getBoundingClientRect();
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,rect.width,rect.height);
  ctx.strokeStyle="#111827";
  ctx.lineWidth=3.2;
  ctx.lineCap="round";
  ctx.lineJoin="round";
  signaturePadHasInk=false;
  const saveBtn=document.getElementById("signatureSaveBtn");
  if(saveBtn) saveBtn.innerHTML='<i data-lucide="check"></i> Save Signature';
  lucide.createIcons();
}
function trimmedSignatureDataUrl(){
  const source=document.getElementById("signatureCanvas");
  const sw=source.width,sh=source.height;
  const sctx=source.getContext("2d");
  const pixels=sctx.getImageData(0,0,sw,sh);
  const data=pixels.data;
  let minX=sw,minY=sh,maxX=-1,maxY=-1;
  const threshold=225;

  for(let y=0;y<sh;y++){
    for(let x=0;x<sw;x++){
      const i=(y*sw+x)*4;
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(a>0 && (r<threshold || g<threshold || b<threshold)){
        if(x<minX)minX=x;
        if(x>maxX)maxX=x;
        if(y<minY)minY=y;
        if(y>maxY)maxY=y;
      }
    }
  }

  if(maxX<0||maxY<0) return "";

  const pad=Math.round(Math.min(sw,sh)*0.035);
  minX=Math.max(0,minX-pad);
  minY=Math.max(0,minY-pad);
  maxX=Math.min(sw-1,maxX+pad);
  maxY=Math.min(sh-1,maxY+pad);

  const cropW=maxX-minX+1;
  const cropH=maxY-minY+1;

  // Keep signatures compact so many projects can safely stay in Local Storage.
  const maxW=650;
  const maxH=220;
  const scale=Math.min(1,maxW/cropW,maxH/cropH);
  const outW=Math.max(1,Math.round(cropW*scale));
  const outH=Math.max(1,Math.round(cropH*scale));

  const out=document.createElement("canvas");
  out.width=outW;
  out.height=outH;
  const octx=out.getContext("2d");
  octx.fillStyle="#ffffff";
  octx.fillRect(0,0,outW,outH);
  octx.drawImage(source,minX,minY,cropW,cropH,0,0,outW,outH);

  return out.toDataURL("image/jpeg",0.72);
}
function saveSignatureFromPad(){
  const p=projects.find(x=>x.id===activeReportProjectId);
  if(!p||!activeSignatureRole) return;
  if(!signaturePadHasInk){
    toast("Please add a signature first");
    return;
  }
  const dataUrl=trimmedSignatureDataUrl();
  if(!dataUrl){
    toast("Please add a signature first");
    return;
  }
  const personName=signerNameForRole(p,activeSignatureRole);
  const libraryItem=saveSignatureToLibrary(activeSignatureRole,personName,dataUrl);
  p.signatures={...(p.signatures||{}),[activeSignatureRole]:dataUrl};
  p.signatureRefs={...(p.signatureRefs||{}),[activeSignatureRole]:libraryItem.id};
  p.updatedAt=Date.now();
  save();
  const roleLabel=signatureRoleLabel(activeSignatureRole);
  closeSignaturePad();
  document.getElementById("reportPaper").innerHTML=reportHtml(p);
  renderProjects();
  renderDashboard();
  toast(`${roleLabel} signature saved to Firestore library`);
}
function loadDataImage(src){
  return new Promise((resolve,reject)=>{
    if(!src){resolve(null);return;}
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}

function reportHtml(p){
  normalizeProjectServices(p);
  const n=projectNumbers(p);
  const services=p.services||[];
  const serviceAllocated=serviceBudgetsTotal(services);
  const serviceUnallocated=Number(p.revenue||0)-serviceAllocated;

  const departmentSections=services.map((s,i)=>{
    const rentalIncluded=projectServiceRentalPaid(p.id,s.id);
    const otherProduction=Math.max(0,Number(s.productionCost||0)-rentalIncluded);
    const crewTotal=serviceCrewAllocationTotal(s);
    const budgetProfit=serviceBudgetProfit(s);
    const targetDifference=budgetProfit-Number(s.targetProfit||0);
    const crewRows=(s.crew||[]).map(m=>`
      <tr>
        <td><b>${escapeHtml(m.name)}</b></td>
        <td><span class="report-role">${escapeHtml(m.role)}</span></td>
        <td>${Number(m.payment||0).toLocaleString("en-LK")}</td>
      </tr>`).join("");

    return `
      <div class="report-section-title">${i+2}. ${escapeHtml(s.name)} — Department Budget</div>
      <table class="report-table">
        <thead><tr><th>DESCRIPTION</th><th>AMOUNT (LKR)</th></tr></thead>
        <tbody>
          <tr><td>Allocated Revenue</td><td>${Number(s.budget||0).toLocaleString("en-LK")}</td></tr>
          <tr><td>Total Production Cost <small>(includes department rentals)</small></td><td>- ${Number(s.productionCost||0).toLocaleString("en-LK")}</td></tr>
          <tr><td>Rental Payments Included in Production Cost</td><td>${Number(rentalIncluded).toLocaleString("en-LK")}</td></tr>
          <tr><td>Other / Remaining Production Cost</td><td>${Number(otherProduction).toLocaleString("en-LK")}</td></tr>
          <tr><td>Crew Allocation</td><td>- ${Number(crewTotal).toLocaleString("en-LK")}</td></tr>
          <tr><td>Target Profit</td><td>${Number(s.targetProfit||0).toLocaleString("en-LK")}</td></tr>
          <tr class="strong-row"><td>Budget Net Profit</td><td>${money(budgetProfit)}</td></tr>
          <tr><td>Profit vs Target</td><td>${money(targetDifference)}</td></tr>
        </tbody>
      </table>

      <div class="report-subsection-title">${escapeHtml(s.name)} Crew (${(s.crew||[]).length} Assignments | Total: ${money(crewTotal)})</div>
      <table class="report-table">
        <thead><tr><th>MEMBER NAME</th><th>ROLE / RESPONSIBILITIES</th><th>PAYMENT (LKR)</th></tr></thead>
        <tbody>
          ${crewRows || `<tr><td colspan="3" style="text-align:center;color:#8794a7">No crew assigned to this department.</td></tr>`}
          <tr class="strong-row"><td colspan="2">Department Crew Total</td><td>${money(crewTotal)}</td></tr>
        </tbody>
      </table>`;
  }).join("");

  return `
    <div class="report-header">
      <div class="copy">
        <h1>FrameFusion Studio</h1>
        <h2>${escapeHtml(p.name)}</h2>
        <p>${escapeHtml(p.subtitle || "Official Department Budget Breakdown & Crew Payment Allocation")}</p>
      </div>
      <div class="report-logo-wrap"><img src="assets/framefusion-logo-transparent.png" alt="FrameFusion logo" /></div>
    </div>

    <div class="report-meta-line">
      ${p.date?`<span><b>Date:</b> ${formatDate(p.date)}</span>`:""}
      ${p.client?`<span><b>Client/Event:</b> ${escapeHtml(p.client)}</span>`:""}
      ${p.location?`<span><b>Location:</b> ${escapeHtml(p.location)}</span>`:""}
    </div>

    <div class="report-kpis">
      <div class="report-kpi"><span>Total Revenue</span><b>${money(p.revenue)}</b></div>
      <div class="report-kpi"><span>Production Cost</span><b>${money(n.equipmentTotal)}</b></div>
      <div class="report-kpi"><span>Crew Allocation</span><b>${money(n.crewTotal)}</b></div>
      <div class="report-kpi profit"><span>Budget Net Profit</span><b>${money(n.netProfit)}</b></div>
    </div>

    <div class="report-section-title">1. Project Financial Summary</div>
    <table class="report-table">
      <thead><tr><th>DESCRIPTION</th><th>AMOUNT (LKR)</th></tr></thead>
      <tbody>
        <tr><td>Total Project Revenue</td><td>${Number(p.revenue||0).toLocaleString("en-LK")}</td></tr>
        <tr><td>Revenue Allocated to Departments</td><td>${Number(serviceAllocated).toLocaleString("en-LK")}</td></tr>
        ${serviceUnallocated!==0?`<tr><td>${serviceUnallocated>0?"Unallocated Revenue":"Overallocated Revenue"}</td><td>${money(Math.abs(serviceUnallocated))}</td></tr>`:""}
        <tr><td>Total Production Cost</td><td>- ${Number(n.equipmentTotal).toLocaleString("en-LK")}</td></tr>
        <tr><td>Rental Payments Included in Production Cost</td><td>${Number(n.rentalPaid).toLocaleString("en-LK")}</td></tr>
        <tr><td>Total Crew Allocation</td><td>- ${Number(n.crewTotal).toLocaleString("en-LK")}</td></tr>
        <tr><td>Total Target Profit</td><td>${Number(n.targetProfit).toLocaleString("en-LK")}</td></tr>
        <tr class="strong-row"><td>Project Budget Net Profit</td><td>${money(n.netProfit)}</td></tr>
      </tbody>
    </table>

    ${departmentSections}

    <div class="report-signatures">
      ${signatureCardHtml(p,"director")}
      ${signatureCardHtml(p,"manager")}
    </div>

    <div class="report-footer">FrameFusion Studio • ${escapeHtml(p.name)} • Department Budget Report • Generated by FrameFusion Budget & Crew Manager</div>
  `;
}

function openReport(id){
  const p=projects.find(x=>x.id===id); if(!p) return;
  activeReportProjectId=id;
  document.getElementById("reportModalTitle").textContent=p.name;
  document.getElementById("reportPaper").innerHTML=reportHtml(p);
  openModal("reportModal");
  lucide.createIcons();
}

const FRAMEFUSION_LOGO_DATA = "data:image/png;base64,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";

function roundRect(ctx, x, y, w, h, r, fill, stroke=null, lineWidth=1){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}

function fitText(ctx, text, maxWidth, startSize, weight="700", family="Arial"){
  let size=startSize;
  while(size>12){
    ctx.font=`${weight} ${size}px ${family}`;
    if(ctx.measureText(text).width<=maxWidth) break;
    size-=1;
  }
  return size;
}

function drawMoney(ctx, value){
  return `LKR ${Number(value||0).toLocaleString("en-LK")}`;
}

function loadReportLogo(){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=FRAMEFUSION_LOGO_DATA;
  });
}

function drawContainedImage(ctx,img,x,y,w,h){
  const ratio=Math.min(w/img.width,h/img.height);
  const dw=img.width*ratio, dh=img.height*ratio;
  ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}

function drawReportHeader(ctx,p,logo,W,margin){
  const x=margin,y=80,w=W-margin*2,h=225;
  roundRect(ctx,x,y,w,h,16,"#0f1b31");
  ctx.fillStyle="#19a9e6";
  ctx.font="900 48px Arial";
  ctx.fillText("FrameFusion Studio",x+38,y+68);

  const title=String(p.name||"Project Budget");
  const titleSize=fitText(ctx,title,w-390,33,"800");
  ctx.fillStyle="#ffffff";
  ctx.font=`800 ${titleSize}px Arial`;
  ctx.fillText(title,x+38,y+125);

  ctx.fillStyle="#9daabe";
  ctx.font="400 22px Arial";
  ctx.fillText(String(p.subtitle||"Official Budget Breakdown & Crew Payment Allocation"),x+38,y+170);

  if(logo) drawContainedImage(ctx,logo,x+w-300,y+50,245,125);

  return y+h;
}

function drawKpis(ctx,p,n,W,margin,startY){
  const gap=18, boxW=(W-margin*2-gap*3)/4, boxH=120, y=startY+30;
  const data=[
    ["TOTAL REVENUE",drawMoney(ctx,p.revenue),"#111b2e"],
    ["PRODUCTION COST",drawMoney(ctx,n.equipmentTotal),"#111b2e"],
    ["TOTAL CREW PAY",drawMoney(ctx,n.crewTotal),"#111b2e"],
    ["NET PROFIT",drawMoney(ctx,n.netProfit),n.netProfit<0?"#dc2626":"#20b457"]
  ];
  data.forEach((d,i)=>{
    const x=margin+i*(boxW+gap);
    roundRect(ctx,x,y,boxW,boxH,14,"#ffffff","#dce3eb",2);
    ctx.textAlign="center";
    ctx.fillStyle="#6d7c91";
    ctx.font="800 17px Arial";
    ctx.fillText(d[0],x+boxW/2,y+35);
    const size=fitText(ctx,d[1],boxW-20,28,"900");
    ctx.fillStyle=d[2];
    ctx.font=`900 ${size}px Arial`;
    ctx.fillText(d[1],x+boxW/2,y+78);
    ctx.textAlign="left";
  });
  return y+boxH;
}

function drawSectionTitle(ctx,title,W,margin,y){
  ctx.fillStyle="#111b2e";
  ctx.font="900 28px Arial";
  ctx.fillText(title,margin,y+30);
  ctx.strokeStyle="#bdc8d5";
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(margin,y+50);ctx.lineTo(W-margin,y+50);ctx.stroke();
  return y+68;
}

function drawFinancialTable(ctx,p,n,W,margin,y){
  const x=margin,w=W-margin*2;
  const allocated=serviceBudgetsTotal(p.services||[]);
  const rows=[
    ["Total Project Revenue",Number(p.revenue||0).toLocaleString("en-LK"),false],
    ["Revenue Allocated to Departments",Number(allocated).toLocaleString("en-LK"),false],
    ["Total Production Cost","- "+Number(n.equipmentTotal||0).toLocaleString("en-LK"),false],
    ["Rental Payments Included",Number(n.rentalPaid||0).toLocaleString("en-LK"),false],
    ["Total Crew Allocation","- "+Number(n.crewTotal||0).toLocaleString("en-LK"),false],
    ["Total Target Profit",Number(n.targetProfit||0).toLocaleString("en-LK"),false],
    ["Project Budget Net Profit",drawMoney(ctx,n.netProfit),true]
  ];
  const headerH=58,rowH=55;
  ctx.fillStyle="#1d2c43";ctx.fillRect(x,y,w,headerH);
  ctx.fillStyle="#fff";ctx.font="800 18px Arial";
  ctx.fillText("DESCRIPTION",x+20,y+36);
  ctx.fillText("AMOUNT (LKR)",x+w-300,y+36);

  rows.forEach((r,i)=>{
    const ry=y+headerH+i*rowH;
    ctx.fillStyle=i===rows.length-1?"#eef2f8":(i%2?"#f8f9fb":"#ffffff");
    ctx.fillRect(x,ry,w,rowH);
    ctx.strokeStyle="#e6ebf0";ctx.lineWidth=1;ctx.strokeRect(x,ry,w,rowH);
    ctx.fillStyle="#182235";
    ctx.font=`${r[2]?"800":"400"} 18px Arial`;
    ctx.fillText(r[0],x+20,ry+35);
    ctx.textAlign="right";
    ctx.font=`${r[2]?"900":"400"} 18px Arial`;
    ctx.fillText(r[1],x+w-20,ry+35);
    ctx.textAlign="left";
  });
  return y+headerH+rows.length*rowH;
}

function drawDepartmentFinanceTable(ctx,p,s,W,margin,y){
  const x=margin,w=W-margin*2;
  const rental=projectServiceRentalPaid(p.id,s.id);
  const other=Math.max(0,Number(s.productionCost||0)-rental);
  const crewTotal=serviceCrewAllocationTotal(s);
  const profit=serviceBudgetProfit(s);
  const targetDiff=profit-Number(s.targetProfit||0);
  const rows=[
    ["Allocated Revenue",Number(s.budget||0).toLocaleString("en-LK"),false],
    ["Production Cost (rentals included)","- "+Number(s.productionCost||0).toLocaleString("en-LK"),false],
    ["Rental Payments Included",Number(rental).toLocaleString("en-LK"),false],
    ["Other / Remaining Production Cost",Number(other).toLocaleString("en-LK"),false],
    ["Crew Allocation","- "+Number(crewTotal).toLocaleString("en-LK"),false],
    ["Target Profit",Number(s.targetProfit||0).toLocaleString("en-LK"),false],
    ["Budget Net Profit",drawMoney(ctx,profit),true],
    ["Profit vs Target",drawMoney(ctx,targetDiff),true]
  ];
  const headerH=54,rowH=51;
  ctx.fillStyle="#1d2c43";ctx.fillRect(x,y,w,headerH);
  ctx.fillStyle="#fff";ctx.font="800 17px Arial";
  ctx.fillText("DEPARTMENT BUDGET",x+20,y+34);
  ctx.fillText("AMOUNT (LKR)",x+w-300,y+34);

  rows.forEach((r,i)=>{
    const ry=y+headerH+i*rowH;
    ctx.fillStyle=r[2]?"#eef2f8":(i%2?"#f8f9fb":"#ffffff");
    ctx.fillRect(x,ry,w,rowH);
    ctx.strokeStyle="#e6ebf0";ctx.lineWidth=1;ctx.strokeRect(x,ry,w,rowH);
    ctx.fillStyle="#182235";
    ctx.font=`${r[2]?"800":"400"} 17px Arial`;
    ctx.fillText(r[0],x+20,ry+33);
    ctx.textAlign="right";
    ctx.fillText(r[1],x+w-20,ry+33);
    ctx.textAlign="left";
  });
  return y+headerH+rows.length*rowH;
}

function drawDepartmentCrewTablePage(ctx,s,rows,W,margin,y,showTotal){
  const x=margin,w=W-margin*2;
  const col1=310,col3=230,col2=w-col1-col3;
  const headerH=58,rowH=59;
  ctx.fillStyle="#1d2c43";ctx.fillRect(x,y,w,headerH);
  ctx.fillStyle="#fff";ctx.font="800 18px Arial";
  ctx.fillText("MEMBER NAME",x+20,y+36);
  ctx.fillText("ROLE / RESPONSIBILITIES",x+col1+20,y+36);
  ctx.fillText("PAYMENT (LKR)",x+col1+col2+20,y+36);

  rows.forEach((m,i)=>{
    const ry=y+headerH+i*rowH;
    ctx.fillStyle=i%2?"#f8f9fb":"#ffffff";ctx.fillRect(x,ry,w,rowH);
    ctx.strokeStyle="#e6ebf0";ctx.strokeRect(x,ry,w,rowH);
    ctx.fillStyle="#172033";ctx.font="800 18px Arial";
    ctx.fillText(truncateCanvasText(ctx,m.name,col1-35),x+20,ry+37);

    const role=String(m.role||"");
    ctx.font="800 16px Arial";
    const pillText=truncateCanvasText(ctx,role,col2-55);
    const pillW=Math.min(ctx.measureText(pillText).width+24,col2-32);
    roundRect(ctx,x+col1+20,ry+13,pillW,32,6,"#e5ebf2");
    ctx.fillStyle="#45566f";
    ctx.fillText(pillText,x+col1+32,ry+35);

    ctx.textAlign="right";ctx.fillStyle="#172033";ctx.font="400 18px Arial";
    ctx.fillText(Number(m.payment||0).toLocaleString("en-LK"),x+w-20,ry+37);
    ctx.textAlign="left";
  });

  let endY=y+headerH+rows.length*rowH;
  if(showTotal){
    ctx.fillStyle="#eef2f8";ctx.fillRect(x,endY,w,rowH);
    ctx.strokeStyle="#c9d3df";ctx.lineWidth=2;ctx.strokeRect(x,endY,w,rowH);
    ctx.fillStyle="#172033";ctx.font="900 18px Arial";
    ctx.fillText(`${s.name} Crew Total`,x+20,endY+37);
    ctx.textAlign="right";ctx.fillText(drawMoney(ctx,serviceCrewAllocationTotal(s)),x+w-20,endY+37);ctx.textAlign="left";
    endY+=rowH;
  }
  return endY;
}

function drawServiceBudgetTablePage(ctx,p,rows,W,margin,y,showTotal){
  const x=margin,w=W-margin*2;
  const col1=w-300;
  const headerH=58,rowH=55;
  ctx.fillStyle="#1d2c43";ctx.fillRect(x,y,w,headerH);
  ctx.fillStyle="#fff";ctx.font="800 18px Arial";
  ctx.fillText("SERVICE / DEPARTMENT",x+20,y+36);
  ctx.fillText("ALLOCATED REVENUE (LKR)",x+col1+20,y+36);

  rows.forEach((item,i)=>{
    const ry=y+headerH+i*rowH;
    ctx.fillStyle=i%2?"#f8f9fb":"#ffffff";ctx.fillRect(x,ry,w,rowH);
    ctx.strokeStyle="#e6ebf0";ctx.lineWidth=1;ctx.strokeRect(x,ry,w,rowH);
    ctx.fillStyle="#172033";ctx.font="800 18px Arial";
    ctx.fillText(truncateCanvasText(ctx,item.name||"Service",col1-40),x+20,ry+35);
    ctx.textAlign="right";ctx.font="400 18px Arial";
    ctx.fillText(Number(item.budget||0).toLocaleString("en-LK"),x+w-20,ry+35);
    ctx.textAlign="left";
  });

  let endY=y+headerH+rows.length*rowH;
  if(showTotal){
    const allocated=serviceBudgetsTotal(p.services||[]);
    ctx.fillStyle="#eef2f8";ctx.fillRect(x,endY,w,rowH);
    ctx.strokeStyle="#c9d3df";ctx.lineWidth=2;ctx.strokeRect(x,endY,w,rowH);
    ctx.fillStyle="#172033";ctx.font="900 18px Arial";
    ctx.fillText("Total Allocated to Services",x+20,endY+35);
    ctx.textAlign="right";ctx.fillText(drawMoney(ctx,allocated),x+w-20,endY+35);ctx.textAlign="left";
    endY+=rowH;
  }
  return endY;
}

function drawEquipmentTablePage(ctx,p,rows,W,margin,y,showTotal){
  const n=projectNumbers(p),x=margin,w=W-margin*2;
  const col1=w-260;
  const headerH=58,rowH=55;
  ctx.fillStyle="#1d2c43";ctx.fillRect(x,y,w,headerH);
  ctx.fillStyle="#fff";ctx.font="800 18px Arial";
  ctx.fillText("PRODUCTION ITEM / SERVICE",x+20,y+36);
  ctx.fillText("COST (LKR)",x+col1+20,y+36);

  rows.forEach((item,i)=>{
    const ry=y+headerH+i*rowH;
    ctx.fillStyle=i%2?"#f8f9fb":"#ffffff";ctx.fillRect(x,ry,w,rowH);
    ctx.strokeStyle="#e6ebf0";ctx.lineWidth=1;ctx.strokeRect(x,ry,w,rowH);
    ctx.fillStyle="#172033";ctx.font="800 18px Arial";
    ctx.fillText(truncateCanvasText(ctx,item.name||"Unnamed equipment",col1-40),x+20,ry+35);
    ctx.textAlign="right";ctx.font="400 18px Arial";
    ctx.fillText(Number(item.cost||0).toLocaleString("en-LK"),x+w-20,ry+35);
    ctx.textAlign="left";
  });

  let endY=y+headerH+rows.length*rowH;
  if(showTotal){
    ctx.fillStyle="#eef2f8";ctx.fillRect(x,endY,w,rowH);
    ctx.strokeStyle="#c9d3df";ctx.lineWidth=2;ctx.strokeRect(x,endY,w,rowH);
    ctx.fillStyle="#172033";ctx.font="900 18px Arial";
    ctx.fillText("Total Production Cost",x+20,endY+35);
    ctx.textAlign="right";ctx.fillText(drawMoney(ctx,n.equipmentTotal),x+w-20,endY+35);ctx.textAlign="left";
    endY+=rowH;
  }
  return endY;
}

function truncateCanvasText(ctx,text,maxWidth){
  text=String(text||"");
  if(ctx.measureText(text).width<=maxWidth) return text;
  while(text.length>2 && ctx.measureText(text+"…").width>maxWidth) text=text.slice(0,-1);
  return text+"…";
}

function drawCrewTablePage(ctx,p,rows,W,margin,y,showTotal){
  const n=projectNumbers(p),x=margin,w=W-margin*2;
  const col1=310,col3=230,col2=w-col1-col3;
  const headerH=58,rowH=59;
  ctx.fillStyle="#1d2c43";ctx.fillRect(x,y,w,headerH);
  ctx.strokeStyle="#68758a";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+col1,y);ctx.lineTo(x+col1,y+headerH);ctx.moveTo(x+col1+col2,y);ctx.lineTo(x+col1+col2,y+headerH);ctx.stroke();
  ctx.fillStyle="#fff";ctx.font="800 18px Arial";
  ctx.fillText("MEMBER NAME",x+20,y+36);
  ctx.fillText("ROLE / RESPONSIBILITIES",x+col1+20,y+36);
  ctx.fillText("PAYMENT (LKR)",x+col1+col2+20,y+36);

  rows.forEach((m,i)=>{
    const ry=y+headerH+i*rowH;
    ctx.fillStyle=i%2?"#f8f9fb":"#ffffff";ctx.fillRect(x,ry,w,rowH);
    ctx.strokeStyle="#e6ebf0";ctx.strokeRect(x,ry,w,rowH);
    ctx.fillStyle="#172033";ctx.font="800 18px Arial";
    ctx.fillText(truncateCanvasText(ctx,m.name,col1-35),x+20,ry+37);

    const role=String(m.role||"");
    ctx.font="800 16px Arial";
    const pillText=truncateCanvasText(ctx,role,col2-55);
    const pillW=Math.min(ctx.measureText(pillText).width+24,col2-32);
    roundRect(ctx,x+col1+20,ry+13,pillW,32,6,"#e5ebf2");
    ctx.fillStyle="#45566f";
    ctx.fillText(pillText,x+col1+32,ry+35);

    ctx.textAlign="right";ctx.fillStyle="#172033";ctx.font="400 18px Arial";
    ctx.fillText(Number(m.payment||0).toLocaleString("en-LK"),x+w-20,ry+37);
    ctx.textAlign="left";
  });

  let endY=y+headerH+rows.length*rowH;
  if(showTotal){
    ctx.fillStyle="#eef2f8";ctx.fillRect(x,endY,w,rowH);
    ctx.strokeStyle="#c9d3df";ctx.lineWidth=2;ctx.strokeRect(x,endY,w,rowH);
    ctx.fillStyle="#172033";ctx.font="900 18px Arial";
    ctx.fillText("Total Crew Payments",x+20,endY+37);
    ctx.textAlign="right";ctx.fillText(drawMoney(ctx,n.crewTotal),x+w-20,endY+37);ctx.textAlign="left";
    endY+=rowH;
  }
  return endY;
}


function drawSignatureArea(ctx,p,role,img,x,y,w,h){
  const label=signatureRoleLabel(role);
  const signerName=signerNameForRole(p,role);
  const imageH=h-66;
  if(img){
    const pad=16;
    const ratio=Math.min((w-pad*2)/img.width,(imageH-pad)/img.height);
    const dw=img.width*ratio,dh=img.height*ratio;
    ctx.drawImage(img,x+(w-dw)/2,y+(imageH-dh)/2,dw,dh);
  }else{
    ctx.save();
    ctx.setLineDash([8,8]);
    ctx.strokeStyle="#cbd5df";
    ctx.lineWidth=2;
    roundRect(ctx,x+8,y+6,w-16,imageH-12,10,null,"#cbd5df",2);
    ctx.restore();
    ctx.textAlign="center";
    ctx.fillStyle="#a0acbb";
    ctx.font="800 14px Arial";
    ctx.fillText("SIGNATURE NOT ADDED",x+w/2,y+imageH/2+5);
    ctx.textAlign="left";
  }
  ctx.strokeStyle="#46566d";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(x,y+imageH+6);
  ctx.lineTo(x+w,y+imageH+6);
  ctx.stroke();
  ctx.textAlign="center";
  ctx.fillStyle="#172033";
  ctx.font="900 17px Arial";
  ctx.fillText(truncateCanvasText(ctx,signerName,w-16),x+w/2,y+imageH+31);
  ctx.fillStyle="#66758a";
  ctx.font="800 13px Arial";
  ctx.fillText(label.toUpperCase(),x+w/2,y+imageH+52);
  ctx.textAlign="left";
}
function drawApprovalSignatures(ctx,p,directorImg,managerImg,W,margin,y){
  const gap=90;
  const w=(W-margin*2-gap)/2;
  const h=200;
  drawSignatureArea(ctx,p,"director",directorImg,margin,y,w,h);
  drawSignatureArea(ctx,p,"manager",managerImg,margin+w+gap,y,w,h);
  return y+h;
}

function drawFooter(ctx,p,W,margin,H){
  ctx.strokeStyle="#e1e7ee";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(margin,H-100);ctx.lineTo(W-margin,H-100);ctx.stroke();
  ctx.textAlign="center";
  ctx.fillStyle="#9aa8bb";ctx.font="400 15px Arial";
  ctx.fillText(`FrameFusion Studio • ${p.name} Budget Report • Generated by FrameFusion Budget & Crew Manager`,W/2,H-58);
  ctx.textAlign="left";
}

async function buildReportCanvases(p){
  const W=1240,H=1754,margin=72,bottomLimit=H-125;
  normalizeProjectServices(p);
  const logo=await loadReportLogo().catch(()=>null);
  const signatures=projectSignatures(p);
  const [directorSignatureImg,managerSignatureImg]=await Promise.all([
    loadDataImage(signatures.director).catch(()=>null),
    loadDataImage(signatures.manager).catch(()=>null)
  ]);
  const n=projectNumbers(p);
  const services=p.services||[];
  const pages=[];

  function createPage(continuationTitle=null){
    const canvas=document.createElement("canvas");
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#f8fafc";ctx.fillRect(0,0,W,H);
    let y;
    if(!continuationTitle){
      y=drawReportHeader(ctx,p,logo,W,margin);
      y=drawKpis(ctx,p,n,W,margin,y);
      y=drawSectionTitle(ctx,"1. Project Financial Summary",W,margin,y+18);
      y=drawFinancialTable(ctx,p,n,W,margin,y);
    }else{
      roundRect(ctx,margin,80,W-margin*2,145,16,"#0f1b31");
      ctx.fillStyle="#19a9e6";ctx.font="900 38px Arial";
      ctx.fillText("FrameFusion Studio",margin+32,137);
      ctx.fillStyle="#fff";ctx.font="800 24px Arial";
      ctx.fillText(truncateCanvasText(ctx,p.name,650),margin+32,180);
      if(logo) drawContainedImage(ctx,logo,W-margin-280,103,220,90);
      y=255;
    }
    return {canvas,ctx,y};
  }
  function finishPage(state){
    drawFooter(state.ctx,p,W,margin,H);
    pages.push(state.canvas);
  }

  let state=createPage();

  for(let si=0;si<services.length;si++){
    const s=services[si];
    const deptTitle=`${si+2}. ${s.name} — Department Budget`;

    const minimumDepartmentHeight=68+54+(8*51)+85;
    if(bottomLimit-state.y<minimumDepartmentHeight){
      finishPage(state);
      state=createPage(deptTitle);
    }

    state.y=drawSectionTitle(state.ctx,deptTitle,W,margin,state.y+22);
    state.y=drawDepartmentFinanceTable(state.ctx,p,s,W,margin,state.y);

    const crew=s.crew||[];
    const crewTitle=`${s.name} Crew (${crew.length} Assignments | Total: ${drawMoney(state.ctx,serviceCrewAllocationTotal(s))})`;

    if(!crew.length){
      if(bottomLimit-state.y<190){
        finishPage(state);
        state=createPage(`${s.name} Crew`);
      }
      state.y=drawSectionTitle(state.ctx,crewTitle,W,margin,state.y+18);
      const x=margin,w=W-margin*2,headerH=58,rowH=59,y=state.y;
      const ctx=state.ctx;
      ctx.fillStyle="#1d2c43";ctx.fillRect(x,y,w,headerH);
      ctx.fillStyle="#fff";ctx.font="800 18px Arial";
      ctx.fillText("MEMBER NAME",x+20,y+36);
      ctx.fillText("ROLE / RESPONSIBILITIES",x+330,y+36);
      ctx.fillText("PAYMENT (LKR)",x+w-210,y+36);
      ctx.fillStyle="#fff";ctx.fillRect(x,y+headerH,w,rowH);
      ctx.strokeStyle="#e6ebf0";ctx.strokeRect(x,y+headerH,w,rowH);
      ctx.textAlign="center";ctx.fillStyle="#8794a7";ctx.font="400 17px Arial";
      ctx.fillText("No crew assigned to this department.",W/2,y+headerH+37);
      ctx.textAlign="left";
      state.y=y+headerH+rowH;
      state.y=drawDepartmentCrewTablePage(state.ctx,s,[],W,margin,state.y,true);
    }else{
      let ci=0;
      let firstChunk=true;
      while(ci<crew.length){
        if(firstChunk){
          const needed=68+58+59+59;
          if(bottomLimit-state.y<needed){
            finishPage(state);
            state=createPage(`${s.name} Crew`);
          }
          state.y=drawSectionTitle(state.ctx,crewTitle,W,margin,state.y+18);
        }else{
          finishPage(state);
          state=createPage(`${s.name} Crew — Continued`);
          state.y=drawSectionTitle(state.ctx,`${s.name} Crew — Continued`,W,margin,state.y);
        }

        const available=bottomLimit-state.y;
        const capacity=Math.max(1,Math.floor((available-58-59)/59));
        const chunk=crew.slice(ci,ci+capacity);
        const isLast=ci+chunk.length>=crew.length;
        state.y=drawDepartmentCrewTablePage(state.ctx,s,chunk,W,margin,state.y,isLast);
        ci+=chunk.length;
        firstChunk=false;
      }
    }
  }

  const signatureSectionHeight=285;
  if(bottomLimit-state.y<signatureSectionHeight){
    finishPage(state);
    state=createPage("Approval Signatures");
    state.y=drawSectionTitle(state.ctx,"Approval Signatures",W,margin,state.y);
  }else{
    state.y=drawSectionTitle(state.ctx,"Approval Signatures",W,margin,state.y+24);
  }
  state.y=drawApprovalSignatures(
    state.ctx,p,directorSignatureImg,managerSignatureImg,W,margin,state.y+10
  );

  finishPage(state);
  return pages;
}

function dataUrlToBytes(dataUrl){
  const b64=dataUrl.split(",")[1];
  const bin=atob(b64);
  const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}

function concatBytes(parts){
  const total=parts.reduce((s,p)=>s+p.length,0);
  const out=new Uint8Array(total);let o=0;
  for(const p of parts){out.set(p,o);o+=p.length;}
  return out;
}

function strBytes(s){ return new TextEncoder().encode(s); }

function canvasesToPdf(canvases){
  const pageW=595.28,pageH=841.89;
  const jpegPages=canvases.map(c=>({bytes:dataUrlToBytes(c.toDataURL("image/jpeg",0.96)),w:c.width,h:c.height}));
  const objCount=2+jpegPages.length*3;
  const objects=new Array(objCount+1);
  const kids=[];

  objects[1]=strBytes("<< /Type /Catalog /Pages 2 0 R >>");
  for(let i=0;i<jpegPages.length;i++){
    const pageObj=3+i*3, imgObj=4+i*3, contentObj=5+i*3;
    kids.push(`${pageObj} 0 R`);
    const im=jpegPages[i];
    objects[pageObj]=strBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${i} ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    const imgHead=strBytes(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>
stream
`);
    const imgTail=strBytes(`\nendstream`);
    objects[imgObj]=concatBytes([imgHead,im.bytes,imgTail]);
    const content=`q
${pageW} 0 0 ${pageH} 0 0 cm
/Im${i} Do
Q`;
    const cb=strBytes(content);
    objects[contentObj]=strBytes(`<< /Length ${cb.length} >>
stream
${content}
endstream`);
  }
  objects[2]=strBytes(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${jpegPages.length} >>`);

  const header=strBytes(`%PDF-1.4\n%FrameFusion\n`);
  const parts=[header];
  const offsets=new Array(objCount+1).fill(0);
  let pos=header.length;
  for(let i=1;i<=objCount;i++){
    offsets[i]=pos;
    const start=strBytes(`${i} 0 obj
`);
    const end=strBytes(`\nendobj\n`);
    parts.push(start,objects[i],end);
    pos+=start.length+objects[i].length+end.length;
  }
  const xrefPos=pos;
  let xref=`xref
0 ${objCount+1}
0000000000 65535 f 
`;
  for(let i=1;i<=objCount;i++) xref+=String(offsets[i]).padStart(10,"0")+` 00000 n \n`;
  xref+=`trailer
<< /Size ${objCount+1} /Root 1 0 R >>
startxref
${xrefPos}
%%EOF`;
  parts.push(strBytes(xref));
  return new Blob(parts,{type:"application/pdf"});
}

async function downloadActiveReport(){
  const p=projects.find(x=>x.id===activeReportProjectId); if(!p) return;
  try{
    toast("Preparing high-quality PDF...");
    const canvases=await buildReportCanvases(p);
    const blob=canvasesToPdf(canvases);
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=(p.name||"framefusion-report").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()+".pdf";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    toast("PDF downloaded");
  }catch(err){
    console.error(err);
    alert("PDF generation failed. Please use Print > Save as PDF as a fallback.");
  }
}


function exportBackup(){
  const data={app:"FrameFusion Studio Budget & Crew Manager",version:5,exportedAt:new Date().toISOString(),crew,projects,signatureLibrary,receipts,appSettings,rentals,tasks};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`framefusion-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
  URL.revokeObjectURL(url); toast("Backup downloaded");
}
function restoreBackup(file){
  if(!file) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(r.result);
      if(!Array.isArray(data.crew)||!Array.isArray(data.projects)) throw new Error("Invalid backup");
      if(!confirm("Restore this backup and replace current local data?")) return;
      crew=data.crew;
      projects=data.projects;
      signatureLibrary=Array.isArray(data.signatureLibrary)?data.signatureLibrary:[];
      receipts=Array.isArray(data.receipts)?data.receipts:[];
      rentals=Array.isArray(data.rentals)?data.rentals:[];
      tasks=Array.isArray(data.tasks)?data.tasks:[];
      appSettings=data.appSettings&&typeof data.appSettings==="object"?{...appSettings,...data.appSettings,id:"company"}:appSettings;
      migrateRentalExpenseRecords();
      migrateRentalPaymentArrays();
      migrateProjectServices();
      save();
      renderDashboard();renderProjects();renderCrew();renderPayments();renderRentals();renderFinancial();renderTasks();
      toast("Backup restored and queued for Firestore sync");
    }catch(e){ alert("Invalid FrameFusion backup file."); }
  };
  r.readAsText(file);
}

document.addEventListener("DOMContentLoaded",()=>{
  showLoginGate();

  document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
  document.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.jump)));
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));

  document.getElementById("loginForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    loginUser(
      document.getElementById("loginUsername").value.trim(),
      document.getElementById("loginPassword").value
    );
  });
  document.getElementById("bootstrapAdminBtn")?.addEventListener("click",bootstrapAdminProfile);
  document.getElementById("bootstrapSignOutBtn")?.addEventListener("click",()=>signOut(auth));
  document.getElementById("signOutBtn")?.addEventListener("click",()=>signOut(auth));

  document.getElementById("newTaskBtn")?.addEventListener("click",newTask);
  document.getElementById("generateChecklistBtn")?.addEventListener("click",generateProjectChecklist);
  document.getElementById("taskProjectFilter")?.addEventListener("change",()=>{
    syncTaskFilterDependencies();renderTasks();
  });
  ["taskServiceFilter","taskStatusFilter","taskAssigneeFilter"].forEach(id=>{
    document.getElementById(id)?.addEventListener("change",renderTasks);
  });
  document.getElementById("taskSearch")?.addEventListener("input",renderTasks);
  document.getElementById("taskProjectId")?.addEventListener("change",syncTaskFormDependencies);
  document.getElementById("taskServiceId")?.addEventListener("change",()=>{
    taskAssigneeOptions(
      document.getElementById("taskProjectId").value,
      document.getElementById("taskServiceId").value,
      "taskAssigneeCrewId",
      false
    );
  });
  document.getElementById("taskForm")?.addEventListener("submit",e=>{
    e.preventDefault();saveTaskForm();
  });

  document.getElementById("newUserBtn")?.addEventListener("click",openNewUser);
  document.getElementById("userForm")?.addEventListener("submit",e=>{
    e.preventDefault();createStaffUser();
  });

  document.getElementById("quickCrewBtn").addEventListener("click",newCrew);
  document.getElementById("quickProjectBtn").addEventListener("click",newProject);
  document.getElementById("newCrewBtn").addEventListener("click",newCrew);
  document.getElementById("newProjectBtn").addEventListener("click",newProject);
  document.getElementById("projectSearch").addEventListener("input",renderProjects);
  document.getElementById("crewSearch").addEventListener("input",renderCrew);

  document.querySelector('[data-action="new-project"]').addEventListener("click",newProject);
  document.querySelector('[data-action="new-crew"]').addEventListener("click",newCrew);
  document.querySelector('[data-action="tasks"]')?.addEventListener("click",()=>setView("tasks"));
  document.querySelector('[data-action="payments"]').addEventListener("click",()=>setView("payments"));
  document.querySelector('[data-action="rentals"]').addEventListener("click",()=>setView("rentals"));
  document.querySelector('[data-action="financial"]').addEventListener("click",()=>setView("financial"));
  document.querySelector('[data-action="backup"]').addEventListener("click",exportBackup);

  document.getElementById("crewForm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const id=document.getElementById("crewId").value;
    const item={
      id:id||uid("crew"),
      name:document.getElementById("crewName").value.trim(),
      role:document.getElementById("crewRole").value.trim(),
      rate:Number(document.getElementById("crewRate").value||0),
      phone:document.getElementById("crewPhone").value.trim(),
      email:document.getElementById("crewEmail").value.trim(),
      notes:document.getElementById("crewNotes").value.trim()
    };
    if(id){const i=crew.findIndex(x=>x.id===id);if(i>=0)crew[i]=item;}else crew.push(item);
    save();closeModal("crewModal");renderCrew();renderDashboard();toast(id?"Crew member updated":"Crew member added");
  });

  document.getElementById("projectForm").addEventListener("submit",(e)=>{
    e.preventDefault();

    const id=document.getElementById("projectId").value;
    const old=id?projects.find(x=>x.id===id):null;
    const projectRevenue=Number(document.getElementById("projectRevenue").value||0);

    const cleanServices=editingProjectServices
      .map(s=>({
        id:s.id||uid("service"),
        name:String(s.name||"").trim(),
        budget:Math.max(0,Number(s.budget||0)),
        productionCost:Math.max(0,Number(s.productionCost||0)),
        targetProfit:Math.max(0,Number(s.targetProfit||0)),
        crew:normalizeDepartmentCrew(s.crew)
      }))
      .filter(s=>s.name);

    if(!cleanServices.length){
      toast("Select at least one Project Service / Department");
      return;
    }

    const allocatedRevenue=serviceBudgetsTotal(cleanServices);
    if(allocatedRevenue!==projectRevenue){
      const diff=projectRevenue-allocatedRevenue;
      toast(diff>0
        ? `Allocate the remaining ${money(diff)} to a department`
        : `Department revenue exceeds project revenue by ${money(Math.abs(diff))}`);
      return;
    }

    for(const s of cleanServices){
      const rentalPaid=id?projectServiceRentalPaid(id,s.id):0;
      if(rentalPaid>Number(s.productionCost||0)){
        toast(`${s.name}: Production Cost must be at least ${money(rentalPaid)} because rentals are already included.`);
        return;
      }
    }

    const p={
      id:id||uid("project"),
      name:document.getElementById("projectName").value.trim(),
      date:document.getElementById("projectDate").value,
      client:document.getElementById("projectClient").value.trim(),
      clientEmail:document.getElementById("projectClientEmail").value.trim(),
      location:document.getElementById("projectLocation").value.trim(),
      revenue:projectRevenue,
      services:JSON.parse(JSON.stringify(cleanServices)),
      subtitle:document.getElementById("projectSubtitle").value.trim(),
      directorName:document.getElementById("projectDirectorName").value.trim(),
      managerName:document.getElementById("projectManagerName").value.trim(),
      signatures:JSON.parse(JSON.stringify(old?.signatures||{director:"",manager:""})),
      signatureRefs:JSON.parse(JSON.stringify(old?.signatureRefs||{director:"",manager:""})),
      eventPayments:JSON.parse(JSON.stringify(old?.eventPayments||[])),
      createdAt:old?.createdAt||Date.now(),
      updatedAt:Date.now(),
      departmentBudgetVersion:14
    };

    syncProjectLegacyTotals(p);

    if(id){
      const i=projects.findIndex(x=>x.id===id);
      if(i>=0) projects[i]=p;
    }else{
      projects.push(p);
    }

    save();
    closeModal("projectModal");
    renderProjects();
    renderDashboard();
    renderPayments();
    renderFinancial();
    setView("projects");
    toast(id?"Project departments updated":"Project created");
  });

  document.getElementById("projectRevenue")?.addEventListener("input",updateProjectCalcs);
  document.getElementById("addCustomProjectServiceBtn")?.addEventListener("click",addCustomProjectService);
  document.getElementById("customProjectServiceName")?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      addCustomProjectService();
    }
  });

  document.getElementById("downloadReportBtn").addEventListener("click",downloadActiveReport);
  document.getElementById("printReportBtn").addEventListener("click",()=>window.print());

  const signatureCanvas=document.getElementById("signatureCanvas");
  signatureCanvas.addEventListener("pointerdown",signaturePointerDown,{passive:false});
  signatureCanvas.addEventListener("pointermove",signaturePointerMove,{passive:false});
  signatureCanvas.addEventListener("pointerup",signaturePointerUp,{passive:false});
  signatureCanvas.addEventListener("pointercancel",signaturePointerUp,{passive:false});
  document.getElementById("signatureClearBtn").addEventListener("click",clearSignatureCanvas);
  document.getElementById("signatureCancelBtn").addEventListener("click",closeSignaturePad);
  document.getElementById("signatureSaveBtn").addEventListener("click",saveSignatureFromPad);
  document.getElementById("useSavedSignatureBtn").addEventListener("click",useSelectedSignature);

  document.getElementById("saveReceiptSettingsBtn").addEventListener("click",saveReceiptSettings);
  document.getElementById("eventPaymentProject").addEventListener("change",()=>{
    const email=document.getElementById("eventPaymentEmail");
    if(email){email.value="";email.dataset.projectId="";}
    renderEventPaymentSection();
  });
  document.getElementById("crewPaymentProject").addEventListener("change",renderCrewPayments);
  document.getElementById("saveEventPaymentBtn").addEventListener("click",saveEventPayment);
  document.getElementById("saveCrewPaymentBtn").addEventListener("click",saveCrewPayment);

  ["rentalTotalAmount","rentalPaidAmount","rentalDepositAmount"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input",renderRentalLiveSummary);
  });
  document.getElementById("rentalProjectId")?.addEventListener("change",()=>{
    const service=document.getElementById("rentalServiceId");
    if(service) service.value="";
    renderRentalServiceOptions();
  });
  document.getElementById("rentalSearch")?.addEventListener("input",renderRentalHistory);
  document.getElementById("saveRentalPaymentBtn")?.addEventListener("click",saveRentalPayment);
  document.getElementById("saveRentalBalanceBtn")?.addEventListener("click",saveRentalBalancePayment);

  document.getElementById("exportBackupBtn").addEventListener("click",exportBackup);
  document.getElementById("restoreInput").addEventListener("change",e=>restoreBackup(e.target.files[0]));

  document.querySelectorAll(".modal").forEach(m=>{
    m.addEventListener("click",e=>{if(e.target===m && m.id!=="reportModal") closeModal(m.id);});
  });

  initAuth();
  lucide.createIcons();
});

window.editTask=editTask;
window.setTaskStatus=setTaskStatus;
window.deleteTaskItem=deleteTaskItem;
window.toggleUserActive=toggleUserActive;
window.editCrew=editCrew;
window.deleteCrew=deleteCrew;
window.editProject=editProject;
window.duplicateProject=duplicateProject;
window.deleteProject=deleteProject;
window.toggleProjectServicePreset=toggleProjectServicePreset;
window.updateProjectServiceName=updateProjectServiceName;
window.updateProjectServiceBudget=updateProjectServiceBudget;
window.updateProjectServiceProductionCost=updateProjectServiceProductionCost;
window.updateProjectServiceTargetProfit=updateProjectServiceTargetProfit;
window.removeProjectService=removeProjectService;
window.openCrewPickerForService=openCrewPickerForService;
window.toggleCrewForActiveService=toggleCrewForActiveService;
window.updateDepartmentCrewRole=updateDepartmentCrewRole;
window.updateDepartmentCrewPayment=updateDepartmentCrewPayment;
window.removeDepartmentCrew=removeDepartmentCrew;
window.openRentalBalancePayment=openRentalBalancePayment;
window.resendRentalReceipt=resendRentalReceipt;
window.deleteRental=deleteRental;
window.openReport=openReport;
window.openProjectPayments=openProjectPayments;
window.openCrewPayment=openCrewPayment;
window.resendReceipt=resendReceipt;
window.openSignaturePad=openSignaturePad;
window.useSelectedSignature=useSelectedSignature;
