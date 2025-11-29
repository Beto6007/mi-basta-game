import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  increment,
  getDocs,
  arrayUnion
} from "firebase/firestore";

// --- 0. ICONOS SVG (Tamaños aún más reducidos) ---
const Icons = {
  Trophy: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  Play: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  Loader: () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Message: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
};

// --- 1. CONFIGURACIÓN FIREBASE ---
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined') {
      return JSON.parse(__firebase_config);
    }
  } catch (e) { console.warn("Usando config fallback"); }
  return {
    apiKey: "AIzaSyB0ClIdjUww3q4FTg44kgjNfL7xwzKEHY8",
    authDomain: "mi-basta-671ae.firebaseapp.com",
    projectId: "mi-basta-671ae",
    storageBucket: "mi-basta-671ae.firebasestorage.app",
    messagingSenderId: "781888126486",
    appId: "1:781888126486:web:93cb68e3012b9736b97f37"
  };
};

const app = initializeApp(getFirebaseConfig());
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'mi-basta-671ae';

// --- 2. DICCIONARIO Y UTILIDADES ---
const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const CATEGORIES = ['Nombre', 'Flor/Fruto', 'Color', 'Animal', 'País/Ciudad', 'Cosa'];
const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙', '🦄'];
const normalize = (text) => text ? text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
const LETTERS_POOL = "ABCDEFGILMNOPRSTUVZ";

const QUICK_CHATS = ["¡Hola! 👋", "¡Listos! 🚀", "¡A ganar! 🏆", "¡Qué nervios! 😬", "¡Suerte! 🍀", "¡Dale start! ⏳", "¡Bastaaaaa! ✋", "¡Ups! 😂"];

const DICTIONARY = {
  'Flor/Fruto': ['arandano', 'aguacate', 'anana', 'apio', 'banana', 'berenjena', 'brocoli', 'cereza', 'ciruela', 'coco', 'coliflor', 'durazno', 'datil', 'frambuesa', 'fresa', 'frutilla', 'granada', 'guanabana', 'higo', 'jicama', 'jitomate', 'kiwi', 'lima', 'limon', 'lechuga', 'mango', 'manzana', 'melon', 'mora', 'mandarina', 'naranja', 'nuez', 'papaya', 'pera', 'piña', 'platano', 'sandia', 'uva', 'vainilla', 'zanahoria', 'zapote'],
  'Color': ['amarillo', 'azul', 'anil', 'ambar', 'arena', 'beige', 'blanco', 'bermejo', 'cafe', 'celeste', 'cian', 'cobre', 'crema', 'caoba', 'dorado', 'escarlata', 'esmeralda', 'fucsia', 'gris', 'granate', 'hueso', 'indigo', 'jade', 'kaki', 'lila', 'lavanda', 'morado', 'marron', 'magenta', 'naranja', 'negro', 'ocre', 'oro', 'oliva', 'plata', 'purpura', 'rojo', 'rosa', 'rubi', 'salmon', 'sepia', 'turquesa', 'verde', 'violeta', 'zafiro'],
  'Animal': ['aguila', 'abeja', 'araña', 'ardilla', 'avestruz', 'atun', 'alce', 'ballena', 'buho', 'burro', 'bisonte', 'caballo', 'cabra', 'cerdo', 'camello', 'canguro', 'cocodrilo', 'conejo', 'colibri', 'delfin', 'dragon', 'elefante', 'erizo', 'escorpion', 'foca', 'flamenco', 'gato', 'gallo', 'gorila', 'gusano', 'guepardo', 'hipopotamo', 'hormiga', 'hiena', 'halcon', 'iguana', 'impala', 'jabali', 'jaguar', 'jirafa', 'koala', 'leon', 'leopardo', 'lobo', 'loro', 'libelula', 'mono', 'medusa', 'mosca', 'murcielago', 'mapache', 'nutria', 'oso', 'oveja', 'oruga', 'perro', 'pato', 'pinguino', 'pez', 'puma', 'pantera', 'quetzal', 'raton', 'rata', 'rana', 'rinoceronte', 'serpiente', 'sapo', 'suricata', 'tigre', 'tortuga', 'tiburon', 'toro', 'tucan', 'unicornio', 'urraca', 'vaca', 'venado', 'vibora', 'wombat', 'zorro', 'zarigueya'],
  'País/Ciudad': ['argentina', 'alemania', 'australia', 'austria', 'angola', 'argelia', 'afganistan', 'belgica', 'brasil', 'bolivia', 'bulgaria', 'barcelona', 'bogota', 'buenos aires', 'berlin', 'canada', 'china', 'colombia', 'chile', 'cuba', 'costa rica', 'caracas', 'cdmx', 'dinamarca', 'dubai', 'españa', 'estados unidos', 'egipto', 'ecuador', 'francia', 'finlandia', 'grecia', 'guatemala', 'honduras', 'hungria', 'holanda', 'india', 'indonesia', 'italia', 'irlanda', 'jamaica', 'japon', 'jordania', 'kenia', 'londres', 'lima', 'lisboa', 'mexico', 'madrid', 'marruecos', 'moscu', 'noruega', 'nicaragua', 'nigeria', 'nueva york', 'oman', 'peru', 'panama', 'portugal', 'polonia', 'paris', 'qatar', 'rusia', 'roma', 'suecia', 'suiza', 'turquia', 'tokio', 'uruguay', 'ucrania', 'venezuela', 'vietnam', 'washington', 'yemen', 'zambia', 'zimbabwe']
};

const isValidInDictionary = (category, word) => {
  const cleanWord = normalize(word);
  if (!DICTIONARY[category]) return true;
  return DICTIONARY[category].includes(cleanWord);
};

// --- 3. COMPONENTE RULETA (Aún más compacto) ---
const LetterRoulette = ({ targetLetter, onFinish }) => {
  const [currentLetter, setCurrentLetter] = useState('A');
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    let interval;
    if (!isStopping) {
      interval = setInterval(() => {
        const randomChar = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
        setCurrentLetter(randomChar);
      }, 50);
      setTimeout(() => setIsStopping(true), 2500);
    } else {
      setCurrentLetter(targetLetter);
      const timeout = setTimeout(() => {
        onFinish();
      }, 1000);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(interval);
  }, [isStopping, targetLetter, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="text-white text-lg font-bold mb-4 uppercase tracking-[0.3em] animate-pulse">Sorteando</div>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
        {/* Tamaño reducido: w-32 h-32 */}
        <div className="relative w-32 h-32 bg-slate-900 border-4 border-indigo-500 rounded-full flex items-center justify-center shadow-2xl">
          <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            {currentLetter}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- 4. ESTILOS Y APP PRINCIPAL ---
const customBgStyle = {
  background: 'radial-gradient(circle at top right, #4f46e5 0%, #312e81 30%, #1e1b4b 100%)',
  minHeight: '100vh'
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [playerName, setPlayerName] = useState(localStorage.getItem('basta_player_name') || '');
  const [playerAvatar, setPlayerAvatar] = useState(localStorage.getItem('basta_player_avatar') || AVATARS[0]);

  const [gameId, setGameId] = useState('');
  const [gameState, setGameState] = useState('LOGIN');
  const [gameData, setGameData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const [showRoulette, setShowRoulette] = useState(false);
  const [inputs, setInputs] = useState({});
  const [isLocalLocked, setIsLocalLocked] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const hasUpdatedScore = useRef(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        setErrorMsg("Error de conexión.");
        setAuthLoading(false);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) fetchLeaderboard();
    });
  }, []);

  useEffect(() => {
    if (!gameId || !user) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const unsub = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameData(data);
        setGameState(data.status || 'LOGIN');

        if (data.status === 'PLAYING') {
          hasUpdatedScore.current = false;
          const now = Date.now();
          if (data.startTime && now < data.startTime) {
            setShowRoulette(true);
          } else {
            setShowRoulette(false);
          }
        }
      } else {
        setGameState('LOGIN');
        setGameId('');
      }
    });
    return () => unsub();
  }, [gameId, user]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameData?.chat]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || showRoulette || !gameData?.endTime) return;
    const tick = () => {
      const now = Date.now();
      const remaining = Math.ceil((gameData.endTime - now) / 1000);
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0 && gameData.host === user.uid) {
        handleTimeUp(gameId);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [gameState, showRoulette, gameData]);

  const fetchLeaderboard = async () => {
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard'),
        orderBy('score', 'desc'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const leaders = [];
      querySnapshot.forEach((doc) => leaders.push(doc.data()));
      setLeaderboard(leaders);
    } catch (e) { console.error(e); }
  };

  const ensureUserInLeaderboard = async () => {
    if (!user) return;
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', user.uid);
    await setDoc(userRef, {
      name: playerName,
      avatar: playerAvatar,
      lastSeen: Date.now()
    }, { merge: true });
  };

  const createGame = async () => {
    if (!playerName.trim()) return alert("Ingresa tu nombre");
    localStorage.setItem('basta_player_name', playerName);
    localStorage.setItem('basta_player_avatar', playerAvatar);
    await ensureUserInLeaderboard();
    const newRoomId = generateRoomId();
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', newRoomId);
    try {
      await setDoc(gameRef, {
        status: 'LOBBY',
        host: user.uid,
        players: { [user.uid]: { name: playerName, avatar: playerAvatar, score: 0 } },
        answers: {},
        chat: [],
        letter: '',
        createdAt: Date.now()
      });
      setGameId(newRoomId);
    } catch (e) { console.error(e); alert("Error creando sala."); }
  };

  const joinGame = async (code) => {
    if (!playerName.trim()) return alert("Ingresa tu nombre");
    if (!code) return alert("Ingresa un código");
    localStorage.setItem('basta_player_name', playerName);
    localStorage.setItem('basta_player_avatar', playerAvatar);
    await ensureUserInLeaderboard();
    const roomId = code.toUpperCase();
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', roomId);
    try {
      const snap = await getDoc(gameRef);
      if (!snap.exists()) return alert("Sala no encontrada");
      await updateDoc(gameRef, {
        [`players.${user.uid}`]: { name: playerName, avatar: playerAvatar, score: 0 }
      });
      setGameId(roomId);
    } catch (e) { console.error(e); alert("Error al unirse."); }
  };

  const sendQuickMessage = async (text) => {
    if (!gameId || !user) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    try {
      await updateDoc(gameRef, {
        chat: arrayUnion({
          uid: user.uid,
          name: playerName,
          avatar: playerAvatar,
          text: text,
          timestamp: Date.now()
        })
      });
    } catch (e) { console.error("Error chat", e); }
  };

  const allResults = useMemo(() => {
    if (!gameData || gameState !== 'SCORING') return null;
    const answers = gameData.answers || {};
    const players = gameData.players || {};
    const letter = normalize(gameData.letter || '');
    const resultsByCategory = {};
    const playerTotalScores = {};

    Object.keys(players).forEach(uid => playerTotalScores[uid] = 0);

    CATEGORIES.forEach(cat => {
      resultsByCategory[cat] = [];
      const wordsInCat = [];
      Object.keys(players).forEach(uid => {
        const word = normalize(answers[uid]?.[cat] || '');
        wordsInCat.push({ uid, word });
      });

      wordsInCat.forEach(({ uid, word }) => {
        let points = 0;
        let status = 'invalid';
        if (word && word.startsWith(letter)) {
          if (!isValidInDictionary(cat, answers[uid]?.[cat])) {
            status = 'not_in_dict';
          } else {
            const isRepeated = wordsInCat.filter(w => w.uid !== uid && w.word === word && w.word !== '').length > 0;
            status = isRepeated ? 'repeated' : 'unique';
            points = isRepeated ? 50 : 100;
          }
        }
        playerTotalScores[uid] += points;
        resultsByCategory[cat].push({
          uid,
          name: players[uid]?.name,
          avatar: players[uid]?.avatar,
          word: answers[uid]?.[cat] || '',
          points,
          status
        });
      });
    });

    return { resultsByCategory, playerTotalScores };
  }, [gameData, gameState]);

  useEffect(() => {
    if (gameState === 'SCORING' && allResults && user && !hasUpdatedScore.current) {
      const myPoints = allResults.playerTotalScores[user.uid] || 0;
      if (myPoints > 0) {
        const userLeaderboardRef = doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', user.uid);
        updateDoc(userLeaderboardRef, {
          score: increment(myPoints),
          lastPlayed: Date.now()
        }).catch(err => console.error(err));
      }
      hasUpdatedScore.current = true;
    }
  }, [gameState, allResults, user]);

  const startGame = async () => {
    // NUEVA VALIDACIÓN: Mínimo 2 jugadores
    if (!gameData || !gameData.players || Object.keys(gameData.players).length < 2) {
      return alert("Se necesitan al menos 2 jugadores conectados para iniciar la partida.");
    }

    const letters = LETTERS_POOL;
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const rouletteDuration = 3500;
    const now = Date.now();
    const startTime = now + rouletteDuration;
    const endTime = startTime + 120000;
    setIsLocalLocked(false);
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    await updateDoc(gameRef, {
      status: 'PLAYING',
      letter: randomLetter,
      startTime: startTime,
      endTime: endTime,
      answers: {},
      bastaCaller: null
    });
    const cleanInputs = {};
    CATEGORIES.forEach(c => cleanInputs[c] = '');
    setInputs(cleanInputs);
  };

  const handleBasta = async () => {
    setIsLocalLocked(true);
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    try {
      const snap = await getDoc(gameRef);
      const data = snap.data();
      const updates = { [`answers.${user.uid}`]: inputs };
      if (!data.bastaCaller) {
        updates.bastaCaller = user.uid;
        const newEndTime = Date.now() + 20000;
        if (newEndTime < data.endTime) {
          updates.endTime = newEndTime;
        }
      }
      await updateDoc(gameRef, updates);
    } catch (e) { console.error("Error al presionar basta", e); }
  };

  const handleTimeUp = async (id) => {
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', id);
    await updateDoc(gameRef, { status: 'SCORING' });
  };

  useEffect(() => {
    if (gameState === 'SCORING' && gameId) {
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
      updateDoc(gameRef, { [`answers.${user.uid}`]: inputs }).catch(console.error);
    }
  }, [gameState]);

  // --- VISTAS ---

  if (authLoading) return <div className="flex flex-col items-center justify-center h-screen text-white" style={customBgStyle}><Icons.Loader /></div>;
  if (errorMsg) return <div className="flex flex-col items-center justify-center h-screen text-white text-center" style={customBgStyle}><Icons.Alert /><p>{errorMsg}</p></div>;

  // --- 1. VISTA LOGIN MEJORADA (MÁS COMPACTA Y LAYOUT AJUSTADO) ---
  if (!gameId || gameState === 'LOGIN') {
    return (
      <div className="text-white p-3 font-sans min-h-screen flex items-center justify-center text-xs md:text-sm" style={customBgStyle}>
        {/* max-w-4xl */}
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-5">
            <h1 className="text-4xl md:text-6xl font-black drop-shadow-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500">BASTA!</h1>
            <p className="text-white/60 font-medium tracking-[0.5em] text-[10px] uppercase">Multiplayer Edition</p>
          </div>

          {/* Grid Layout Modificado: 3 columnas en desktop. 2 izq (Form), 1 der (Leaderboard) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* IZQUIERDA: FORMULARIO (Ocupa 2/3) */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-xl p-5 rounded-[1.5rem] shadow-2xl border border-white/20">
              <h2 className="text-lg font-bold mb-3 text-center md:text-left">Tu Perfil</h2>

              {/* Avatares */}
              <div className="mb-4">
                <label className="block text-[9px] font-bold text-white/50 mb-2 uppercase tracking-wider">Elige tu Avatar</label>
                <div className="grid grid-cols-8 gap-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setPlayerAvatar(a)} className={`text-lg aspect-square flex items-center justify-center rounded-lg transition-all ${playerAvatar === a ? 'bg-white/30 scale-110 shadow-lg' : 'hover:bg-white/10 opacity-60 hover:opacity-100'}`}>{a}</button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-white/50 mb-1 uppercase tracking-wider">Tu Nombre</label>
                  <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/20 border border-white/10 focus:border-indigo-400 rounded-lg p-2.5 text-white outline-none transition-all font-bold text-sm" placeholder="Ej. Juan" />
                </div>

                <button onClick={createGame} disabled={!playerName.trim()} className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 py-2.5 rounded-xl font-black shadow-lg flex justify-center items-center gap-2 transform active:scale-95 transition-all text-sm"><Icons.Zap /> CREAR SALA</button>

                <div className="flex gap-2 items-center">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <span className="text-[9px] text-white/40 font-bold uppercase">O únete</span>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <div className="flex gap-2">
                  <input id="roomCode" className="flex-1 bg-black/20 border border-white/10 focus:border-indigo-400 rounded-xl p-2.5 text-center text-white font-mono uppercase font-bold tracking-widest placeholder:text-white/20 outline-none text-sm" placeholder="CÓDIGO" />
                  <button onClick={() => joinGame(document.getElementById('roomCode').value)} className="bg-white/10 hover:bg-white/20 px-5 rounded-xl font-bold border border-white/10 transition-colors text-xs">ENTRAR</button>
                </div>
              </div>
            </div>

            {/* DERECHA: TOP GLOBAL (Ocupa 1/3, altura fija con scroll) */}
            <div className="md:col-span-1 bg-black/20 backdrop-blur-xl p-5 rounded-[1.5rem] border border-white/10 h-[460px] md:h-full max-h-[460px] flex flex-col">
              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10 shrink-0">
                <div className="p-1.5 bg-yellow-400/20 rounded-lg text-yellow-400"><Icons.Trophy /></div>
                <div>
                  <h2 className="text-base font-bold text-white">Top Global</h2>
                  <p className="text-[9px] text-white/50">Los mejores jugadores</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-0">
                {leaderboard.length === 0 ? (<p className="text-white/40 text-center italic mt-10 text-[10px]">Cargando ranking...</p>) : (
                  leaderboard.map((e, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-xl border transition-all ${i < 3 ? 'bg-white/10 border-white/20' : 'border-transparent hover:bg-white/5'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-black w-4 text-center ${i === 0 ? 'text-yellow-400 text-base' : i === 1 ? 'text-gray-300 text-sm' : i === 2 ? 'text-orange-400 text-sm' : 'text-white/30 text-xs'}`}>{i + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg bg-black/30 w-7 h-7 flex items-center justify-center rounded-full">{e.avatar || '👤'}</span>
                          <span className="font-bold text-white/90 text-xs">{e.name || 'Anónimo'}</span>
                        </div>
                      </div>
                      <span className="font-mono bg-black/30 px-2 py-0.5 rounded-lg text-[9px] text-indigo-300 font-bold tracking-wider">{e.score || 0} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- 2. VISTA LOBBY MEJORADA (CHAT FIXED + COMPACTA) ---
  if (gameState === 'LOBBY') {
    return (
      <div className="text-white p-3 min-h-screen font-sans flex items-center justify-center text-xs md:text-sm" style={customBgStyle}>
        {/* max-w-4xl y altura fija en desktop para evitar que crezca */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 h-full md:h-[450px]">

          {/* COLUMNA IZQUIERDA (Info Sala + Jugadores) */}
          <div className="md:col-span-2 flex flex-col gap-4 h-full">

            {/* Card Sala */}
            <div className="bg-white/10 backdrop-blur-xl p-5 rounded-[1.5rem] border border-white/20 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
              <div>
                <p className="text-[9px] uppercase font-bold text-white/50 tracking-widest mb-1">CÓDIGO DE SALA</p>
                <div className="text-4xl font-mono font-black tracking-widest text-white drop-shadow-lg">{gameId}</div>
              </div>
              <div className="hidden md:block h-10 w-px bg-white/10"></div>
              <div className="text-center md:text-right">
                <p className="text-[9px] uppercase font-bold text-white/50 tracking-widest mb-1">JUGADORES</p>
                <div className="text-2xl font-black text-indigo-300">{gameData?.players ? Object.keys(gameData.players).length : 0}</div>
              </div>
            </div>

            {/* Grid Jugadores (Scrollable) */}
            <div className="flex-1 bg-black/20 backdrop-blur-md p-4 rounded-[1.5rem] border border-white/10 overflow-y-auto min-h-[150px]">
              <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2">En la sala</h3>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {gameData?.players && Object.values(gameData.players).map((p, i) => (
                  <div key={i} className="bg-white/10 p-2 rounded-xl flex flex-col items-center gap-1 w-20 animate-fadeIn border border-white/5 hover:bg-white/20 transition-colors">
                    <span className="text-2xl filter drop-shadow-md">{p.avatar}</span>
                    <span className="font-bold text-[10px] truncate w-full text-center">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón Start */}
            <div className="hidden md:block shrink-0">
              {gameData?.host === user.uid ? (
                <button onClick={startGame} className="w-full bg-white text-indigo-900 py-3 rounded-xl font-black text-lg flex justify-center items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"><Icons.Play /> START GAME</button>
              ) : <div className="text-center animate-pulse text-white/60 text-sm font-medium bg-black/10 py-3 rounded-xl border border-white/5">Esperando al anfitrión...</div>}
            </div>
          </div>

          {/* COLUMNA DERECHA (Chat) - Altura fija relativa al grid padre */}
          <div className="md:col-span-1 flex flex-col h-[350px] md:h-full bg-black/20 backdrop-blur-xl rounded-[1.5rem] border border-white/10 overflow-hidden shadow-inner">
            <div className="p-3 bg-white/5 border-b border-white/5 font-bold flex items-center gap-2 text-xs">
              <Icons.Message /> Chat de Sala
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {(!gameData?.chat || gameData.chat.length === 0) && (
                <div className="text-center text-white/30 text-[10px] italic mt-8">¡Di hola! 👋</div>
              )}
              {gameData?.chat?.map((msg, idx) => {
                const isMe = msg.uid === user.uid;
                return (
                  <div key={idx} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="text-lg self-end">{msg.avatar}</div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                      <span className="text-[8px] text-white/40 px-1 mb-0.5">{msg.name}</span>
                      <div className={`px-2.5 py-1 rounded-2xl text-[10px] font-medium shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={chatBottomRef} />
            </div>

            <div className="p-2 bg-black/40 border-t border-white/10 shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_CHATS.map((text, i) => (
                  <button key={i} onClick={() => sendQuickMessage(text)} className="whitespace-nowrap bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold px-2 py-1 rounded-full border border-white/10 transition-colors flex-shrink-0">{text}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Botón Start (Móvil) */}
          <div className="md:hidden">
            {gameData?.host === user.uid ? (
              <button onClick={startGame} className="w-full bg-white text-indigo-900 py-3 rounded-xl font-black text-base flex justify-center items-center gap-2 shadow-xl hover:scale-105 transition-transform"><Icons.Play /> START GAME</button>
            ) : <div className="text-center animate-pulse text-white/60 text-xs font-medium bg-black/10 py-3 rounded-xl">Esperando al anfitrión...</div>}
          </div>

        </div>
      </div>
    );
  }

  // --- 3. VISTA JUEGO MEJORADA (BOTON BASTA CERCA Y COMPACTO) ---
  if (gameState === 'PLAYING') {
    const allFilled = CATEGORIES.every(cat => inputs[cat] && inputs[cat].length > 0);
    return (
      <div className="min-h-screen pb-10 font-sans relative text-sm md:text-base" style={{ background: 'linear-gradient(to bottom, #f1f5f9 0%, #cbd5e1 100%)' }}>
        {showRoulette && <LetterRoulette targetLetter={gameData?.letter} onFinish={() => setShowRoulette(false)} />}

        {/* Header Compacto max-w-2xl */}
        <div className="sticky top-2 z-20 max-w-2xl mx-auto px-3">
          <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-xl px-3 py-2 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur opacity-30 rounded-lg"></div>
                {/* w-10 h-10 text-2xl */}
                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 text-white w-10 h-10 flex items-center justify-center rounded-lg font-black text-2xl shadow-inner border border-white/20">{gameData?.letter}</div>
              </div>
              <div className="leading-tight hidden xs:block">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Letra</p>
                <p className="text-slate-900 font-bold text-sm">Actual</p>
              </div>
            </div>

            {gameData?.bastaCaller && timeLeft <= 20 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full animate-pulse shadow-xl border-2 border-white">¡ÚLTIMOS SEGUNDOS!</div>
            )}

            <div className={`flex items-center gap-2 font-mono font-black px-3 py-1 rounded-lg transition-colors ${timeLeft <= 20 ? 'text-red-600 bg-red-50 border border-red-100 shadow-inner' : 'text-slate-700 bg-slate-100'}`}>
              <span className="text-base opacity-50"><Icons.Clock /></span> <span className="text-xl">{timeLeft}</span><span className="text-[10px] self-end mb-1 opacity-50">s</span>
            </div>
          </div>
        </div>

        {/* Grid Inputs max-w-2xl */}
        <div className="max-w-2xl mx-auto p-3 space-y-3 mt-1">
          {isLocalLocked && (
            <div className="bg-slate-800 text-white p-3 rounded-xl flex items-center justify-center gap-2 animate-fadeIn shadow-2xl border border-slate-700">
              <Icons.Lock /> <span className="font-bold text-sm">¡Has declarado basta! Esperando resultados...</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              // p-3
              <div key={cat} className={`bg-white p-3 rounded-xl shadow-lg border border-white/50 focus-within:ring-2 ring-indigo-500/20 focus-within:border-indigo-500 transition-all transform hover:-translate-y-0.5 ${isLocalLocked ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cat}</label>
                  {DICTIONARY[cat] && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">Diccionario</span>}
                </div>
                <input
                  type="text"
                  value={inputs[cat] || ''}
                  onChange={(e) => setInputs(prev => ({ ...prev, [cat]: e.target.value.toLowerCase() }))}
                  // text-lg
                  className="w-full text-lg font-bold text-slate-800 outline-none bg-transparent placeholder:text-slate-200"
                  placeholder={showRoulette ? "..." : `${gameData?.letter}...`}
                  autoComplete="off"
                  disabled={showRoulette || isLocalLocked}
                />
              </div>
            ))}
          </div>

          {/* BOTÓN BASTA: AHORA DENTRO DEL FLUJO, JUSTO DEBAJO DE LOS INPUTS */}
          <div className="mt-4">
            <button
              onClick={handleBasta}
              disabled={showRoulette || gameData?.bastaCaller || isLocalLocked}
              // py-3 text-lg
              className={`w-full text-white font-black text-lg py-3 rounded-xl shadow-xl flex justify-center items-center gap-2 transform active:scale-95 transition-all border-b-4 disabled:opacity-50 disabled:grayscale disabled:border-transparent ${allFilled && !isLocalLocked ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-green-800 hover:brightness-110 animate-pulse' : 'bg-gradient-to-r from-rose-600 to-red-600 border-red-900 hover:brightness-110'}`}
            >
              <span className="text-2xl drop-shadow-md">✋</span>
              <span className="drop-shadow-md">{isLocalLocked ? 'ESPERANDO...' : gameData?.bastaCaller ? '¡TIEMPO!' : allFilled ? '¡PRESIONA AHORA!' : '¡BASTA!'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 4. VISTA SCORING COMPACTA (2 COLUMNAS EN DESKTOP) ---
  if (gameState === 'SCORING') {
    const { resultsByCategory, playerTotalScores } = allResults || { resultsByCategory: {}, playerTotalScores: {} };
    const myTotal = playerTotalScores[user.uid] || 0;

    return (
      <div className="text-slate-800 min-h-screen bg-slate-100 font-sans pb-10 text-xs md:text-sm">
        {/* Header Compacto */}
        <div className="bg-indigo-900 text-white pt-6 pb-8 px-6 rounded-b-[1.5rem] shadow-2xl relative overflow-hidden mb-[-1.5rem]">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="relative z-10 text-center max-w-xl mx-auto">
            <p className="text-indigo-300 font-bold text-[9px] uppercase tracking-[0.3em] mb-1">RESULTADOS DE LA LETRA</p>
            {/* text-5xl */}
            <h2 className="text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-200 drop-shadow-lg">{gameData?.letter}</h2>
            <div className="inline-flex items-center bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full shadow-lg">
              <span className="text-indigo-200 font-medium mr-2 uppercase text-[10px] tracking-wider">Tu puntaje</span>
              <span className="text-2xl font-black text-yellow-400">{myTotal}</span>
            </div>
          </div>
        </div>

        {/* Contenedor Principal Ajustado: Ancho mayor para desktop (max-w-5xl) para caber 2 columnas */}
        <div className="max-w-2xl md:max-w-5xl mx-auto px-3 relative z-10 space-y-6">

          {/* GRID DE RESULTADOS: 1 col en móvil, 2 cols en desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden h-full">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-black text-slate-400 text-[9px] uppercase tracking-widest">{cat}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {resultsByCategory[cat]?.map((res, idx) => {
                    let badgeClass = "bg-slate-100 text-slate-400";
                    let pointsLabel = "0";
                    if (res.status === 'unique') { badgeClass = "bg-emerald-100 text-emerald-600 border border-emerald-200"; pointsLabel = "+100"; }
                    if (res.status === 'repeated') { badgeClass = "bg-amber-100 text-amber-600 border border-amber-200"; pointsLabel = "+50"; }
                    if (res.status === 'not_in_dict') { badgeClass = "bg-rose-100 text-rose-600 border border-rose-200"; pointsLabel = "X"; }

                    return (
                      // p-2 row muy compacta
                      <div key={idx} className={`flex items-center justify-between p-2 hover:bg-slate-50 transition-colors ${res.uid === user.uid ? 'bg-indigo-50/60' : ''}`}>
                        <div className="flex items-center gap-3">
                          {/* Avatar pequeño */}
                          <span className="text-lg filter drop-shadow-sm">{res.avatar}</span>
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0 leading-none">{res.name}</p>
                            <p className="text-sm font-bold text-slate-800 leading-tight">
                              {res.word || <span className="text-slate-300 font-normal italic">---</span>}
                            </p>
                          </div>
                        </div>
                        <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm ${badgeClass}`}>
                          {pointsLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Botones - Centrados y con max-width limitado para que no se estiren demasiado en desktop */}
          <div className="flex gap-3 pb-6 max-w-2xl mx-auto w-full">
            <button onClick={() => { fetchLeaderboard(); setGameState('LOGIN'); }} className="flex-1 bg-white text-slate-600 py-2.5 rounded-xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-xs">Salir</button>
            {gameData?.host === user.uid && (
              <button onClick={startGame} className="flex-[2] bg-indigo-600 text-white py-2.5 rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all flex justify-center items-center gap-2 text-xs">
                Siguiente Ronda <Icons.Play />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}