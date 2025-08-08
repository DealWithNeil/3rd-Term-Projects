const STORAGE_KEY = 'journal_entries_v1';
let entries = [];
let currentId = null;

// DOM
const entriesList = document.getElementById('entriesList');
const newEntryBtn = document.getElementById('newEntryBtn');
const titleInput = document.getElementById('titleInput');
const dateInput = document.getElementById('dateInput');
const moodInput = document.getElementById('moodInput');
const tagsInput = document.getElementById('tagsInput');
const contentInput = document.getElementById('contentInput');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const previewBtn = document.getElementById('previewBtn');
const previewPane = document.getElementById('previewPane');
const searchInput = document.getElementById('searchInput');
const moodFilter = document.getElementById('moodFilter');
const tagFilter = document.getElementById('tagFilter');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const clearBtn = document.getElementById('clearBtn');

// Init
function init(){
  loadEntries();
  bindEvents();
  renderList();
  setTodayDate();
  autosaveSetup();
}

function bindEvents(){
  newEntryBtn.onclick = () => newEntry();
  saveBtn.onclick = () => saveCurrent();
  deleteBtn.onclick = () => deleteCurrent();
  previewBtn.onclick = () => togglePreview();
  searchInput.oninput = () => renderList();
  moodFilter.onchange = () => renderList();
  tagFilter.oninput = () => renderList();
  exportBtn.onclick = () => exportJSON();
  importFile.onchange = (e) => importJSON(e.target.files[0]);
  clearBtn.onclick = () => clearEditor();
  document.querySelectorAll('.toolbar .btn').forEach(b => b.onclick = toolbarAction);
}

function setTodayDate(){
  const today = new Date().toISOString().slice(0,10);
  dateInput.value = today;
}

function loadEntries(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  }catch(e){entries=[]}
}

function saveAll(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function newEntry(){
  currentId = null;
  titleInput.value = '';
  tagsInput.value = '';
  contentInput.value = '';
  moodInput.value = '';
  setTodayDate();
  previewPane.hidden = true;
  titleInput.focus();
}

function saveCurrent(){
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const date = dateInput.value;
  const mood = moodInput.value;
  const tags = tagsInput.value.split(',').map(t=>t.trim()).filter(Boolean);
  if(!title && !content) return alert('Write something or give a title.');

  if(currentId){
    const e = entries.find(x=>x.id===currentId);
    e.title = title; e.content = content; e.date = date; e.tags = tags; e.mood = mood; e.updatedAt = Date.now();
  } else {
    const id = 'entry_' + Date.now();
    entries.unshift({id,title,content,date,mood,tags,createdAt:Date.now(),updatedAt:Date.now()});
    currentId = id;
  }
  saveAll();
  renderList();
  alert('Saved.');
}

function deleteCurrent(){
  if(!currentId) return clearEditor();
  if(!confirm('Delete this entry?')) return;
  entries = entries.filter(e=>e.id!==currentId);
  saveAll();
  newEntry();
  renderList();
}

function renderList(){
  const q = (searchInput.value||'').toLowerCase();
  const mood = moodFilter.value;
  const tagq = (tagFilter.value||'').toLowerCase();
  entriesList.innerHTML = '';
  const filtered = entries.filter(e=>{
    if(mood && e.mood!==mood) return false;
    if(tagq){
      const tags = e.tags.join(',').toLowerCase();
      if(!tags.includes(tagq)) return false;
    }
    if(!q) return true;
    return (e.title||'').toLowerCase().includes(q) || 
           (e.content||'').toLowerCase().includes(q) || 
           (e.tags.join(' ')).toLowerCase().includes(q);
  });

  filtered.forEach(e=>{
    const el = document.createElement('div');
    el.className = 'entryItem';
    el.onclick = ()=>openEntry(e.id);
    el.innerHTML = `
      <div class="entryMain">
        <div class="entryTitle">${escapeHtml(e.title || 'Untitled')}</div>
        <div class="entryMeta">${formatDate(e.date)} &mdash; <span class="muted">${timeAgo(e.updatedAt)}</span></div>
        <div style="margin-top:6px">
          ${(e.tags||[]).slice(0,3).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="entryMood">${e.mood ? emojiForMood(e.mood) : ''}</div>
    `;
    entriesList.appendChild(el);
  });
}

function openEntry(id){
  const e = entries.find(x=>x.id === id);
  if(!e) return;
  currentId = e.id;
  titleInput.value = e.title;
  contentInput.value = e.content;
  dateInput.value = e.date;
  moodInput.value = e.mood || '';
  tagsInput.value = (e.tags || []).join(', ');
  previewPane.hidden = true;
}

function exportJSON(){
  const data = JSON.stringify(entries, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'journal-export-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importJSON(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const imported = JSON.parse(reader.result);
      if(!Array.isArray(imported)) throw new Error('Invalid file');
      entries = imported.concat(entries);
      saveAll();
      renderList();
      alert('Imported ' + imported.length + ' entries.');
    }catch(e){
      alert('Failed to import file.');
    }
  }
  reader.readAsText(file);
}

function clearEditor(){
  if(!confirm('Clear editor? (not saved)')) return;
  newEntry();
}

function togglePreview(){
  if(previewPane.hidden){
    previewPane.innerHTML = renderMarkdown(contentInput.value);
    previewPane.hidden = false;
  } else {
    previewPane.hidden = true;
  }
}

function renderMarkdown(md){
  if(!md) return '<em>Nothing to preview</em>';
  let out = escapeHtml(md);
  out = out.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  out = out.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Improved list handling:
  out = out.replace(/(?:^|\n)- (.*?)(?=\n|$)/g, '<li>$1</li>');
  out = out.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  out = out.replace(/\n/g, '<br>');
  return out;
}

function toolbarAction(e){
  const a = e.currentTarget.dataset.action;
  const ta = contentInput;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const before = ta.value.slice(0,start), mid = ta.value.slice(start,end), after = ta.value.slice(end);
  if(a === 'bold') ta.value = before + '**' + mid + '**' + after;
  else if(a === 'italic') ta.value = before + '*' + mid + '*' + after;
  else if(a === 'h1') ta.value = before + '# ' + mid + after;
  else if(a === 'bullet') ta.value = before + (mid ? '- ' + mid.replace(/\n/g,'\n- ') : '- ') + after;
  // Restore focus and selection
  ta.focus();
  ta.selectionStart = start;
  ta.selectionEnd = end + (a === 'bold' ? 4 : a === 'italic' ? 2 : 0);
}

function autosaveSetup(){
  let timer;
  contentInput.addEventListener('input', ()=>{
    clearTimeout(timer);
    timer = setTimeout(()=>{
      const tmpKey = 'journal_autosave';
      const data = {
        title: titleInput.value,
        content: contentInput.value,
        date: dateInput.value,
        mood: moodInput.value,
        tags: tagsInput.value
      };
      localStorage.setItem(tmpKey, JSON.stringify(data));
    }, 800);
  });
}

// Utilities
function formatDate(d){
  if(!d) return '';
  try{
    return new Date(d + 'T00:00:00').toLocaleDateString();
  }catch(e){
    return d;
  }
}
function timeAgo(ts){
  if(!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if(m < 1) return 'just now';
  if(m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if(h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  return d + 'd';
}
function emojiForMood(m){
  if(m === 'happy') return '😊';
  if(m === 'neutral') return '😐';
  if(m === 'sad') return '😔';
  return '';
}
function escapeHtml(s){
  return (s || '').replace(/&/g,'&amp;')
                  .replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;')
                  .replace(/\"/g,'&quot;');
}
