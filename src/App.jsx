import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import ChatBotView from "./chatbot/ChatBotView";
import AdminPage from "./chatbot/AdminPage";
import { loadPolicies } from "./chatbot/policiesStore";

// ─── policies.json → 내부 포맷 변환 ───────────────────────────────────────

function mapCat(category=""){
  const c=category;
  if(c.includes("일자리")||c.includes("취업")||c.includes("창업"))return"job";
  if(c.includes("주거"))return"house";
  if(c.includes("금융")||c.includes("복지")||c.includes("문화")||c.includes("자산"))return"money";
  if(c.includes("교육")||c.includes("역량")||c.includes("훈련"))return"edu";
  if(c.includes("건강")||c.includes("보건")||c.includes("의료")||c.includes("심리"))return"health";
  return"job";
}

function extractAmount(support=""){
  const m1=support.match(/최대\s*([\d,]+(?:\.\d+)?)\s*억/);
  if(m1)return Math.round(parseFloat(m1[1].replace(/,/g,""))*10000);
  const m2=support.match(/최대\s*([\d,]+)\s*만\s*원/);
  if(m2)return parseInt(m2[1].replace(/,/g,""));
  const m3=support.match(/([\d,]+)\s*만\s*원/);
  if(m3)return parseInt(m3[1].replace(/,/g,""));
  return 0;
}

function parsePeriodEnd(period=""){
  if(!period)return"상시";
  const m=period.match(/~\s*(\d{8})/);
  if(!m)return"상시";
  const d=m[1];
  return`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
}

function buildHowto(applyUrl,refUrl,org){
  const steps=[];
  if(refUrl||applyUrl){
    steps.push("공식 홈페이지에서 공고 내용 및 신청 자격 확인");
  }else{
    steps.push(`${org||"주관기관"} 담당 부서에 신청 일정 문의`);
  }
  if(applyUrl){
    steps.push("우측 '신청하러 가기' 버튼으로 온라인 신청 접수");
  }else if(refUrl){
    steps.push("공고 안내에 따라 신청서 작성 후 제출");
  }else{
    steps.push("담당자 안내에 따라 신청서 작성 후 제출");
  }
  steps.push("제출 서류 검토 및 자격 심사");
  steps.push("선정 결과 개별 통보 후 지원 시작");
  return steps.join("\n");
}

function mapRawPolicy(raw,idx){
  const deadline=parsePeriodEnd(raw.period);
  const d=deadline==="상시"?null:Math.ceil((new Date(deadline)-Date.now())/86400000);
  const hot=d!==null&&d>0&&d<=30;
  const applyUrl=raw.applyUrl||"";
  const refUrl=raw.refUrl||"";
  return{
    id:raw.id||String(idx),
    cat:mapCat(raw.category||""),
    title:raw.name||"",
    org:raw.org||"",
    target:[raw.minAge&&`만 ${raw.minAge}세 이상`,raw.maxAge&&`만 ${raw.maxAge}세 이하`].filter(Boolean).join(", ")||"청년",
    benefit:"",
    supportFull:(raw.support||"").replace(/<[^>]+>/g,"").trim(),
    amount:extractAmount(raw.support||""),
    deadline,
    views:idx%500+100,
    hot,
    description:raw.summary||"",
    howto:buildHowto(applyUrl,refUrl,raw.org||""),
    docs:"",
    applyUrl,
    refUrl,
  };
}

// ─── 데이터 ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value:"all",    emoji:"📋", label:"전체" },
  { value:"job",    emoji:"💼", label:"취업·창업" },
  { value:"house",  emoji:"🏠", label:"주거" },
  { value:"money",  emoji:"💰", label:"금융·자산" },
  { value:"edu",    emoji:"📚", label:"교육·역량" },
  { value:"health", emoji:"🏥", label:"건강·심리" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c=>[c.value,c.label]));
const CAT_EMOJI  = Object.fromEntries(CATEGORIES.map(c=>[c.value,c.emoji]));
const CAT_COLORS = {
  job:    { bg:"#EFF6FF", border:"#BFDBFE", text:"#1D4ED8", dot:"#3B82F6", grad:"linear-gradient(135deg,#1E3A8A,#3B82F6)" },
  house:  { bg:"#F0FDF4", border:"#BBF7D0", text:"#15803D", dot:"#22C55E", grad:"linear-gradient(135deg,#14532D,#22C55E)" },
  money:  { bg:"#FFFBEB", border:"#FDE68A", text:"#B45309", dot:"#F59E0B", grad:"linear-gradient(135deg,#78350F,#F59E0B)" },
  edu:    { bg:"#F5F3FF", border:"#DDD6FE", text:"#6D28D9", dot:"#8B5CF6", grad:"linear-gradient(135deg,#4C1D95,#8B5CF6)" },
  health: { bg:"#FFF1F2", border:"#FECDD3", text:"#BE123C", dot:"#F43F5E", grad:"linear-gradient(135deg,#881337,#F43F5E)" },
};

const POLICIES = [
  { id:"p1",  cat:"job",    title:"청년 일자리 도약 장려금",    org:"고용노동부",     target:"만 15~34세 미취업청년",      benefit:"월 최대 60만원 × 6개월",    amount:360,   deadline:"2025-12-31", views:8420, hot:true,
    description:"청년층의 취업을 촉진하고 중소·중견기업의 안정적 인력 수급을 지원하기 위한 장려금입니다.",
    howto:"1. 워크넷(work.net) 접속\n2. 청년 일자리 도약 장려금 신청\n3. 필요 서류 제출\n4. 심사 후 지급",
    docs:"주민등록등본, 재직증명서, 통장사본" },
  { id:"p2",  cat:"house",  title:"청년 월세 한시 특별지원",    org:"국토교통부",     target:"만 19~34세 중위소득 60%↓",  benefit:"월 최대 20만원 × 12개월",   amount:240,   deadline:"2025-06-30", views:6100, hot:true,
    description:"경제적으로 어려운 청년 1인 가구를 위한 월세 지원 사업입니다.",
    howto:"1. 복지로(bokjiro.go.kr) 접속\n2. 청년 월세 한시 특별지원 신청\n3. 소득·재산 서류 제출\n4. 자격 심사 후 계좌 지급",
    docs:"임대차계약서, 주민등록등본, 소득증빙서류" },
  { id:"p3",  cat:"money",  title:"청년 도약 계좌",             org:"금융위원회",     target:"만 19~34세 근로·사업소득자", benefit:"5년 후 최대 5,000만원",      amount:5000,  deadline:"상시",       views:5500, hot:true,
    description:"청년의 중장기 자산 형성을 위한 정책금융 상품입니다. 5년 유지 시 최대 5,000만원 수령 가능.",
    howto:"1. 취급 은행 방문 또는 앱 신청\n2. 소득 조건 확인\n3. 계좌 개설 후 매월 40~70만원 납입",
    docs:"소득확인증명서, 신분증" },
  { id:"p4",  cat:"edu",    title:"국민내일배움카드",           org:"고용노동부",     target:"만 15세 이상 취업준비생",    benefit:"최대 500만원 직업훈련 지원", amount:500,   deadline:"상시",       views:4800, hot:false,
    description:"국민 스스로 직업능력을 개발할 수 있도록 훈련비를 지원하는 카드형 제도입니다.",
    howto:"1. 고용24 접속\n2. 국민내일배움카드 신청\n3. 상담 후 카드 발급\n4. 훈련기관 선택 후 수강",
    docs:"신분증, 최종학력증명서" },
  { id:"p5",  cat:"health", title:"청년 마음건강 지원사업",     org:"보건복지부",     target:"만 19~34세 청년",            benefit:"전문상담 최대 10회 무료",    amount:0,     deadline:"2025-11-30", views:3200, hot:false,
    description:"심리적 어려움을 겪고 있는 청년이 전문 심리상담을 통해 정신건강을 회복할 수 있도록 지원합니다.",
    howto:"1. 정신건강복지센터 또는 1577-0199 문의\n2. 초기 상담 후 연계 기관 안내\n3. 전문 상담사 배정",
    docs:"신분증 (소득 조건 없음)" },
  { id:"p6",  cat:"job",    title:"청년 취업 아카데미",         org:"교육부",         target:"만 15~34세 미취업청년",      benefit:"무료 직무교육 + 취업연계",   amount:0,     deadline:"상시",       views:2900, hot:false,
    description:"대학과 기업이 연계하여 청년에게 현장 맞춤형 직무교육을 제공하는 사업입니다.",
    howto:"1. HRD-Net 접속\n2. 청년 취업 아카데미 과정 검색\n3. 원하는 과정 신청\n4. 수료 후 취업 연계",
    docs:"신분증, 최종학력증명서" },
  { id:"p7",  cat:"house",  title:"청년 전세임대주택",          org:"LH공사",         target:"만 19~39세 무주택청년",      benefit:"전세금 최대 1.2억 지원",     amount:12000, deadline:"상시",       views:4200, hot:false,
    description:"LH가 기존 주택을 전세계약한 후 청년에게 저렴하게 재임대하는 주거 지원 사업입니다.",
    howto:"1. LH청약센터 접속\n2. 청년 전세임대 공고 확인\n3. 온라인 또는 방문 신청\n4. 심사 후 계약",
    docs:"주민등록등본, 소득증빙, 무주택확인서" },
  { id:"p8",  cat:"money",  title:"청년 희망적금",              org:"금융위원회",     target:"만 19~34세 근로소득자",      benefit:"이자소득 비과세 + 우대금리", amount:600,   deadline:"2025-09-30", views:3800, hot:false,
    description:"청년층의 저축 습관 형성과 자산 형성을 지원하기 위한 비과세 우대 적금 상품입니다.",
    howto:"1. 취급 은행 앱 또는 지점 방문\n2. 소득 조건 확인\n3. 희망적금 신규 신청",
    docs:"근로소득 원천징수영수증, 신분증" },
  { id:"p9",  cat:"edu",    title:"이공계 전문기술연수",        org:"과기정통부",     target:"이공계 대졸 미취업청년",      benefit:"월 100만원 + 연수 비용",     amount:1200,  deadline:"2025-07-31", views:2100, hot:false,
    description:"이공계 대학 졸업 미취업 청년에게 전문 기술 연수 기회를 제공하고 연수지원금을 지급합니다.",
    howto:"1. 과기정통부 홈페이지 공고 확인\n2. 온라인 지원서 제출\n3. 서류심사 및 면접\n4. 연수 기관 배정",
    docs:"졸업증명서, 이공계 전공 증명서, 자기소개서" },
  { id:"p10", cat:"health", title:"청년 정신건강 복지서비스",   org:"보건복지부",     target:"만 18~34세 청년",            benefit:"정신건강 검진 + 연계서비스", amount:0,     deadline:"상시",       views:1700, hot:false,
    description:"정신건강 조기 발견 및 치료 연계를 위한 청년 대상 복지서비스입니다.",
    howto:"1. 가까운 정신건강복지센터 방문\n2. 정신건강 선별검사 실시\n3. 결과에 따른 상담·연계 서비스 제공",
    docs:"신분증 (무료, 별도 증빙 불필요)" },
  { id:"p11", cat:"job",    title:"청년 창업 지원 바우처",      org:"중소벤처기업부", target:"만 39세 이하 예비창업자",    benefit:"최대 1,000만원 사업비 지원", amount:1000,  deadline:"2025-08-31", views:3100, hot:false,
    description:"청년 예비창업자의 초기 사업비(개발·마케팅·지재권 등)를 바우처 형태로 지원합니다.",
    howto:"1. K-스타트업 접속\n2. 청년 창업 지원 바우처 공고 확인\n3. 사업계획서 제출\n4. 심사 후 바우처 지급",
    docs:"사업계획서, 신분증, 사업자등록증(예정)" },
  { id:"p12", cat:"house",  title:"청년 주거급여 분리지급",     org:"국토교통부",     target:"부모와 주소 분리 청년",      benefit:"월 최대 33만원 주거급여",    amount:396,   deadline:"상시",       views:2600, hot:false,
    description:"주거급여 수급 가구의 청년 자녀가 부모와 떨어져 거주할 경우 주거급여를 분리 지급합니다.",
    howto:"1. 주민센터 방문\n2. 주거급여 분리지급 신청서 작성\n3. 서류 제출\n4. 심사 후 지급",
    docs:"임대차계약서, 재학증명서 또는 구직활동 증빙, 주민등록등본" },
];

const SORT_OPTIONS = [
  { value:"popular",  label:"인기순" },
  { value:"deadline", label:"마감 임박순" },
  { value:"amount",   label:"지원금 큰 순" },
  { value:"recent",   label:"최신순" },
];

const NAV_ITEMS = [
  { page:"search",    icon:"🔍", label:"검색" },
  { page:"chatbot",   icon:"🤖", label:"AI챗봇" },
  { page:"mypage",    icon:"👤", label:"마이페이지", hasSub:true },
  { page:"community", icon:"💬", label:"커뮤니티" },
];

const MY_SUB_PAGES = [
  { sub:"custom",    icon:"✨", label:"나의 맞춤 정책" },
  { sub:"checklist", icon:"✅", label:"신청 체크리스트" },
  { sub:"calendar",  icon:"📅", label:"정책 캘린더" },
];

const CHECKLIST_STEPS = [
  "정책 상세 내용 확인",
  "신청 자격 요건 확인",
  "필요 서류 준비",
  "온라인 / 방문 신청",
  "결과 확인 및 대기",
];

const COMMUNITY_POSTS = [
  { id:1, cat:"후기",  title:"청년 도약 계좌 가입 성공! 솔직 후기 공유해요",     author:"미래준비중",   date:"2025-06-05", likes:87,  comments:23, preview:"드디어 청년 도약 계좌 개설했습니다! 처음엔 서류 준비가 막막했는데 은행 앱으로 했더니 15분 만에 끝났어요." },
  { id:2, cat:"정보",  title:"청년 월세 지원 신청 꿀팁 정리 (임박 마감 주의!)",   author:"정책마스터",   date:"2025-06-04", likes:124, comments:31, preview:"신청 시 많이들 놓치는 부분을 정리했어요. 임대차 계약서 날짜 꼭 확인하세요!" },
  { id:3, cat:"Q&A",   title:"국민내일배움카드 재직자도 신청 가능한가요?",          author:"취준생29",     date:"2025-06-03", likes:12,  comments:8,  preview:"현재 단기 아르바이트 중인데 배움카드 신청 자격이 되는지 여쭤봅니다." },
  { id:4, cat:"후기",  title:"청년 취업 아카데미 3개월 수료 후 취업까지 연결됐어요", author:"IT취업완료",   date:"2025-06-02", likes:56,  comments:15, preview:"과정 중에 팀프로젝트가 있었는데 거기서 만난 사람들과 같이 창업까지 준비 중이에요!" },
  { id:5, cat:"정보",  title:"2025년 하반기 청년 지원 정책 변경사항 정리",          author:"정책연구소",   date:"2025-06-01", likes:203, comments:47, preview:"하반기부터 달라지는 청년 정책들을 정리했습니다. 소득 기준이 일부 완화됩니다." },
  { id:6, cat:"Q&A",   title:"전세임대주택 부모님이 주택 보유하면 신청 불가?",      author:"월세탈출꿈꿈", date:"2025-05-31", likes:8,   comments:12, preview:"부모와 별도 주소지이면 괜찮다는 말도 있고 아니라는 말도 있어서 혼란스럽네요." },
  { id:7, cat:"후기",  title:"마음건강 지원사업으로 번아웃 극복한 경험 나눠요",     author:"회복중인청년", date:"2025-05-29", likes:91,  comments:38, preview:"처음에 신청하기 부끄러웠는데 막상 받아보니 정말 큰 도움이 됐어요. 혼자 힘들어하지 마세요." },
  { id:8, cat:"정보",  title:"창업 바우처 + 청년 도약 계좌 동시 수령 가능한가요?", author:"예비창업자K",  date:"2025-05-27", likes:34,  comments:9,  preview:"두 제도 모두 중복 수혜 여부가 궁금해서 직접 문의한 내용 공유드립니다." },
];

// ─── Hooks ─────────────────────────────────────────────────────────────────

function useBreakpoint() {
  const [w, setW] = useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{
    const h=()=>setW(window.innerWidth);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return { isMobile:w<768, isTablet:w>=768&&w<1200, isDesktop:w>=1200, w };
}

function useReveal(threshold=0.12) {
  const ref=useRef(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVisible(true);obs.disconnect();}},{threshold});
    if(ref.current)obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[threshold]);
  return [ref,visible];
}

function useDebounce(val,ms){
  const [dv,setDv]=useState(val);
  useEffect(()=>{const t=setTimeout(()=>setDv(val),ms);return ()=>clearTimeout(t);},[val,ms]);
  return dv;
}

function useLocalStorage(key,init){
  const [val,setVal]=useState(()=>{
    try{
      const s=localStorage.getItem(key);
      if(s===null)return init;
      const p=JSON.parse(s);
      return init instanceof Set?new Set(p):p;
    }catch{return init;}
  });
  const set=useCallback(upd=>{
    setVal(prev=>{
      const next=typeof upd==="function"?upd(prev):upd;
      try{localStorage.setItem(key,JSON.stringify(next instanceof Set?[...next]:next));}catch{}
      return next;
    });
  },[key]);
  return [val,set];
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────

function daysLeft(deadline){
  if(!deadline||deadline==="상시")return null;
  return Math.ceil((new Date(deadline)-Date.now())/86400000);
}

// ─── 공통 컴포넌트 ──────────────────────────────────────────────────────────

function CatBadge({cat,size}){
  const c=CAT_COLORS[cat]||{};
  return(
    <span style={{background:c.bg,border:`1px solid ${c.border}`,color:c.text,
      fontSize:size==="md"?12:11,fontWeight:700,
      padding:size==="md"?"3px 10px":"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>
      {CAT_EMOJI[cat]} {CAT_LABEL[cat]||cat}
    </span>
  );
}

function DeadlinePill({deadline}){
  const d=daysLeft(deadline);
  if(d===null)return<span style={{fontSize:11,color:"#9ca3af"}}>상시 접수</span>;
  if(d<=0) return<span style={{fontSize:11,color:"#9ca3af",background:"#f3f4f6",padding:"2px 8px",borderRadius:20}}>마감됨</span>;
  if(d<=14)return<span style={{fontSize:11,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",padding:"2px 8px",borderRadius:20,fontWeight:700}}>D-{d} 마감임박</span>;
  if(d<=30)return<span style={{fontSize:11,color:"#d97706",background:"#fffbeb",border:"1px solid #fde68a",padding:"2px 8px",borderRadius:20,fontWeight:600}}>D-{d}</span>;
  return<span style={{fontSize:11,color:"#9ca3af"}}>D-{d}</span>;
}

function PolicyCard({policy,favIds,onToggle,onGoDetail,compact,delay=0}){
  const [ref,visible]=useReveal();
  const isFav=favIds.has(policy.id);
  const c=CAT_COLORS[policy.cat]||{};
  return(
    <div ref={ref} onClick={()=>onGoDetail(policy)} style={{
      background:"white",borderRadius:16,border:"1.5px solid #f1f5f9",
      borderLeft:`4px solid ${c.dot||"#e2e8f0"}`,
      padding:compact?"12px 14px":"18px 20px",
      cursor:"pointer",position:"relative",
      transition:"transform 0.2s,box-shadow 0.2s,opacity 0.4s",
      opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(20px)",
      transitionDelay:`${delay}ms`,
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.09)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="";}}
    >
      {policy.hot&&<span style={{position:"absolute",top:10,right:42,fontSize:11,color:"#dc2626",background:"#fef2f2",padding:"2px 7px",borderRadius:20,fontWeight:700}}>🔥 인기</span>}
      <button onClick={e=>{e.stopPropagation();onToggle(policy.id);}}
        style={{position:"absolute",top:9,right:10,background:"none",border:"none",fontSize:18,cursor:"pointer",color:isFav?"#f59e0b":"#d1d5db",padding:4,transition:"color 0.15s,transform 0.12s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.35)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}
      >{isFav?"★":"☆"}</button>
      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <CatBadge cat={policy.cat}/><DeadlinePill deadline={policy.deadline}/>
      </div>
      <div style={{fontWeight:700,fontSize:compact?13:14,color:"#111827",lineHeight:1.4,marginBottom:4,paddingRight:28}}>{policy.title}</div>
      <div style={{fontSize:12,color:"#9ca3af",marginBottom:compact?0:12}}>{policy.org} · {policy.target}</div>
      {!compact&&<div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>자세히 보기 →</div>}
    </div>
  );
}

// ─── 정책 상세 페이지 ──────────────────────────────────────────────────────

function PolicyDetailView({policy,favIds,onToggle,onBack,onGoDetail,bp,policies}){
  const isFav=favIds.has(policy.id);
  const c=CAT_COLORS[policy.cat]||{grad:"linear-gradient(135deg,#1E3A8A,#3B82F6)",bg:"#EFF6FF",border:"#BFDBFE",text:"#1D4ED8"};
  const d=daysLeft(policy.deadline);
  const similar=policies.filter(p=>p.cat===policy.cat&&p.id!==policy.id).slice(0,3);
  const cols=bp.isDesktop?3:bp.isTablet?2:1;

  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"});},[policy.id]);

  return(
    <div style={{background:"#f8fafc",minHeight:"100%",animation:"fadeUp 0.25s ease"}}>
      {/* 뒤로가기 헤더 */}
      <div style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:bp.isDesktop?"0 40px":"0 16px",position:"sticky",top:0,zIndex:40}}>
        <div style={{height:bp.isDesktop?56:52,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"#374151",fontSize:14,fontWeight:600,padding:"8px 0",transition:"color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#1D4ED8"}
            onMouseLeave={e=>e.currentTarget.style.color="#374151"}
          >← 뒤로가기</button>
          <span style={{color:"#e5e7eb"}}>|</span>
          <span style={{fontSize:13,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{policy.title}</span>
          <button onClick={()=>onToggle(policy.id)} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,background:isFav?"#fffbeb":"#f8fafc",border:isFav?"1px solid #fde68a":"1px solid #e5e7eb",borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:600,color:isFav?"#b45309":"#9ca3af",transition:"all 0.15s"}}>
            {isFav?"★ 저장됨":"☆ 저장하기"}
          </button>
        </div>
      </div>

      {/* 히어로 */}
      <div style={{background:c.grad,padding:bp.isDesktop?"52px 40px 44px":bp.isTablet?"36px 24px 30px":"28px 18px 24px",position:"relative",overflow:"hidden",color:"white"}}>
        <div style={{position:"absolute",right:"-5%",top:"-30%",width:bp.isDesktop?360:200,height:bp.isDesktop?360:200,borderRadius:"50%",background:"rgba(255,255,255,0.08)",animation:"floatOrb 8s ease-in-out infinite"}}/>
        <div style={{position:"relative",maxWidth:bp.isDesktop?860:"100%"}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{CAT_EMOJI[policy.cat]} {CAT_LABEL[policy.cat]}</span>
            {d!==null&&d>0&&d<=30&&<span style={{background:"rgba(239,68,68,0.25)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700,color:"#fca5a5"}}>D-{d} 마감임박</span>}
            {policy.hot&&<span style={{background:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700,color:"#fde68a"}}>🔥 인기</span>}
          </div>
          <h1 style={{fontSize:bp.isDesktop?38:bp.isTablet?28:22,fontWeight:900,margin:"0 0 12px",lineHeight:1.25,letterSpacing:"-0.02em"}}>{policy.title}</h1>
          <p style={{fontSize:bp.isDesktop?16:14,opacity:0.85,margin:"0 0 20px",lineHeight:1.7,maxWidth:600}}>{policy.org} · {policy.target}</p>
          {(policy.supportFull||policy.amount>0)&&<div style={{display:"block",background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:14,padding:bp.isDesktop?"14px 22px":"10px 16px"}}>
            <div style={{fontSize:11,opacity:0.7,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>주요 혜택</div>
            {policy.supportFull&&<div style={{fontSize:bp.isDesktop?15:13,fontWeight:600,lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{policy.supportFull}</div>}
            {policy.amount>0&&<div style={{fontSize:12,opacity:0.75,marginTop:8}}>최대 {policy.amount.toLocaleString()}만원</div>}
          </div>}
        </div>
      </div>

      {/* 본문 */}
      <div style={{padding:bp.isDesktop?"40px 40px 60px":bp.isTablet?"28px 24px 60px":"20px 16px 80px"}}>
        <div style={{display:bp.isDesktop?"grid":"block",gridTemplateColumns:"1fr 360px",gap:28,maxWidth:bp.isDesktop?1200:"100%",margin:"0 auto"}}>
          <div>
            {[
              {title:"📋 사업 개요",content:<p style={{fontSize:bp.isDesktop?15:14,color:"#374151",lineHeight:1.8,margin:0}}>{policy.description}</p>},
              {title:"📝 신청 방법",content:(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {policy.howto.split("\n").map((step,i)=>(
                    <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:c.bg,border:`1.5px solid ${c.border}`,color:c.text,fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                      <div style={{fontSize:bp.isDesktop?14:13,color:"#374151",lineHeight:1.7,paddingTop:3}}>{step.replace(/^\d+\.\s*/,"")}</div>
                    </div>
                  ))}
                </div>
              )},
              {title:"📂 필요 서류",content:(
                policy.docs
                  ?<div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {policy.docs.split(",").map(doc=>(
                      <span key={doc} style={{background:c.bg,border:`1px solid ${c.border}`,color:c.text,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600}}>{doc.trim()}</span>
                    ))}
                  </div>
                  :<div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <p style={{margin:0,fontSize:bp.isDesktop?14:13,color:"#374151",lineHeight:1.8}}>
                      필요 서류는 정책마다 다르며 공식 공고문에서 확인하실 수 있습니다.
                    </p>
                    {(policy.refUrl||policy.applyUrl)&&(
                      <a href={policy.refUrl||policy.applyUrl} target="_blank" rel="noopener noreferrer"
                        style={{display:"inline-flex",alignItems:"center",gap:6,background:c.bg,border:`1px solid ${c.border}`,color:c.text,borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700,textDecoration:"none",width:"fit-content"}}
                      >📄 공식 공고문 바로가기 →</a>
                    )}
                  </div>
              )},
            ].map(({title,content},i)=>(
              <section key={i} style={{background:"white",borderRadius:20,padding:bp.isDesktop?"28px 32px":"20px 18px",marginBottom:16,border:"1.5px solid #f1f5f9"}}>
                <h2 style={{fontSize:bp.isDesktop?17:15,fontWeight:800,color:"#111827",marginTop:0,marginBottom:14}}>{title}</h2>
                {content}
              </section>
            ))}
          </div>
          <div>
            <div style={{background:"white",borderRadius:20,padding:bp.isDesktop?"24px":"20px 18px",marginBottom:16,border:"1.5px solid #f1f5f9",position:bp.isDesktop?"sticky":"static",top:72}}>
              <h2 style={{fontSize:bp.isDesktop?15:14,fontWeight:800,color:"#111827",marginTop:0,marginBottom:16}}>📌 핵심 정보</h2>
              {[
                ["🎯 신청 대상",policy.target],
                ["🏛️ 주관 기관",policy.org],
                ["📅 신청 기한",policy.deadline==="상시"?"상시 접수":`${policy.deadline}${d!==null&&d>0?` (D-${d})`:""}`],
                ["💰 지원 금액",policy.amount>0?`최대 ${policy.amount.toLocaleString()}만원`:"비금전 지원"],
                ["👁️ 관심도",`${policy.views.toLocaleString()}명 확인`],
              ].map(([label,val])=>(
                <div key={label} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #f8fafc"}}>
                  <div style={{fontSize:12,color:"#9ca3af",minWidth:90,flexShrink:0,paddingTop:1}}>{label}</div>
                  <div style={{fontSize:13,color:"#374151",fontWeight:600,lineHeight:1.5}}>{val}</div>
                </div>
              ))}
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:20}}>
                <button
                  onClick={()=>{const u=policy.applyUrl||policy.refUrl;if(u)window.open(u,"_blank");}}
                  style={{padding:"14px",borderRadius:14,background:policy.applyUrl||policy.refUrl?c.grad:"#e5e7eb",border:"none",color:policy.applyUrl||policy.refUrl?"white":"#9ca3af",fontSize:15,fontWeight:800,cursor:policy.applyUrl||policy.refUrl?"pointer":"default",boxShadow:policy.applyUrl||policy.refUrl?`0 4px 20px ${c.dot}44`:"none",transition:"opacity 0.15s"}}
                  onMouseEnter={e=>{if(policy.applyUrl||policy.refUrl)e.currentTarget.style.opacity="0.88";}}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                >{policy.applyUrl?"온라인 신청하러 가기 →":policy.refUrl?"공식 홈페이지 바로가기 →":"신청 링크 미제공"}</button>
                <button onClick={()=>onToggle(policy.id)} style={{padding:"12px",borderRadius:14,border:isFav?"1.5px solid #fde68a":"1.5px solid #e5e7eb",background:isFav?"#fffbeb":"white",color:isFav?"#b45309":"#6b7280",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>{isFav?"★ 저장됨":"☆ 저장하기"}</button>
              </div>
            </div>
          </div>
        </div>
        {similar.length>0&&(
          <div style={{maxWidth:bp.isDesktop?1200:"100%",margin:bp.isDesktop?"32px auto 0":"0 auto"}}>
            <h2 style={{fontSize:bp.isDesktop?18:15,fontWeight:800,color:"#111827",marginBottom:14}}>{CAT_EMOJI[policy.cat]} 비슷한 {CAT_LABEL[policy.cat]} 정책</h2>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:bp.isDesktop?14:9}}>
              {similar.map((p,i)=><PolicyCard key={p.id} policy={p} favIds={favIds} onToggle={onToggle} onGoDetail={onGoDetail} delay={i*80}/>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 검색 뷰 ──────────────────────────────────────────────────────────────

function SearchView({favIds,onToggleFav,onGoDetail,bp,policies}){
  const [rawQ,setRawQ]=useState("");
  const [cat,setCat]=useLocalStorage("yoa:cat","all");
  const [sort,setSort]=useLocalStorage("yoa:sort","popular");
  const query=useDebounce(rawQ,300);

  const catCounts=useMemo(()=>{
    const m={all:policies.length};
    CATEGORIES.slice(1).forEach(c=>{m[c.value]=policies.filter(p=>p.cat===c.value).length;});
    return m;
  },[policies]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    let list=policies.filter(p=>{
      if(cat!=="all"&&p.cat!==cat)return false;
      if(q&&!(p.title+p.org+p.target+p.benefit).toLowerCase().includes(q))return false;
      return true;
    });
    if(sort==="deadline")list=[...list].sort((a,b)=>{if(a.deadline==="상시")return 1;if(b.deadline==="상시")return -1;return a.deadline.localeCompare(b.deadline);});
    else if(sort==="amount")list=[...list].sort((a,b)=>b.amount-a.amount);
    else if(sort==="popular")list=[...list].sort((a,b)=>b.views-a.views);
    return list;
  },[query,cat,sort,policies]);

  const cols=bp.isDesktop?3:bp.isTablet?2:1;

  if(bp.isDesktop){
    return(
      <div style={{display:"flex",height:"100%",background:"#f8fafc"}}>
        <div style={{width:220,flexShrink:0,background:"white",borderRight:"1px solid #e5e7eb",padding:"24px 16px",overflowY:"auto"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:14}}>카테고리</div>
          {CATEGORIES.map(c=>(
            <button key={c.value} onClick={()=>setCat(c.value)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",background:cat===c.value?"#EFF6FF":"transparent",color:cat===c.value?"#1D4ED8":"#6b7280",fontSize:13,fontWeight:cat===c.value?700:400,marginBottom:2,transition:"all 0.12s"}}>
              <span>{c.emoji} {c.label}</span><span style={{fontSize:11,opacity:0.7}}>{catCounts[c.value]??0}</span>
            </button>
          ))}
          <div style={{marginTop:20,paddingTop:20,borderTop:"1px solid #e5e7eb"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:10}}>정렬</div>
            {SORT_OPTIONS.map(o=>(
              <button key={o.value} onClick={()=>setSort(o.value)} style={{display:"block",width:"100%",padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",background:sort===o.value?"#EFF6FF":"transparent",color:sort===o.value?"#1D4ED8":"#6b7280",fontSize:13,fontWeight:sort===o.value?700:400,marginBottom:2,textAlign:"left",transition:"all 0.12s"}}>{o.label}</button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <div style={{position:"relative",flex:1,maxWidth:480}}>
              <input type="search" value={rawQ} onChange={e=>setRawQ(e.target.value)} placeholder="정책명, 기관명, 혜택 검색..."
                style={{width:"100%",padding:"11px 42px 11px 16px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none",fontFamily:"inherit",background:"white",boxSizing:"border-box",transition:"border-color 0.15s"}}
                onFocus={e=>e.target.style.borderColor="#3B82F6"}
                onBlur={e=>e.target.style.borderColor="#e2e8f0"}
              />
              {rawQ&&<button onClick={()=>setRawQ("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"#e5e7eb",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
            </div>
            <div style={{fontSize:14,color:"#6b7280"}}><span style={{fontWeight:700,color:"#111827"}}>{filtered.length}건</span>{query&&<span> · "{query}"</span>}</div>
          </div>
          {filtered.length===0
            ?<div style={{textAlign:"center",padding:"80px 0",color:"#9ca3af"}}><div style={{fontSize:48,marginBottom:12}}>🔍</div><div style={{fontSize:16,fontWeight:600,color:"#374151",marginBottom:6}}>검색 결과가 없어요</div><div style={{fontSize:13}}>다른 키워드나 카테고리를 시도해 보세요</div></div>
            :<div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:14}}>{filtered.map((p,i)=><PolicyCard key={p.id} policy={p} favIds={favIds} onToggle={onToggleFav} onGoDetail={onGoDetail} delay={i*40}/>)}</div>
          }
        </div>
      </div>
    );
  }

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"white",padding:"16px 14px 12px",borderBottom:"1px solid #e5e7eb"}}>
        <div style={{fontSize:17,fontWeight:800,color:"#111827",marginBottom:11}}>🔍 정책 검색</div>
        <div style={{position:"relative"}}>
          <input type="search" value={rawQ} onChange={e=>setRawQ(e.target.value)} placeholder="예) 청년 월세, 창업 지원금..."
            style={{width:"100%",padding:"11px 42px 11px 15px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none",background:"#f8fafc",fontFamily:"inherit",transition:"border-color 0.15s",boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor="#3B82F6"}
            onBlur={e=>e.target.style.borderColor="#e2e8f0"}
          />
          {rawQ&&<button onClick={()=>setRawQ("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"#e5e7eb",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
        </div>
      </div>
      <div style={{padding:"8px 14px 6px",overflowX:"auto",background:"white",borderBottom:"1px solid #f1f5f9"}}>
        <div style={{display:"flex",gap:7}}>
          {CATEGORIES.map(c=>(
            <button key={c.value} onClick={()=>setCat(c.value)} style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",borderColor:cat===c.value?"#1D4ED8":"#e2e8f0",background:cat===c.value?"#EFF6FF":"white",color:cat===c.value?"#1D4ED8":"#6b7280",fontSize:12,fontWeight:cat===c.value?700:500,transition:"all 0.12s"}}>{c.emoji} {c.label} <span style={{opacity:0.65,fontSize:11}}>({catCounts[c.value]??0})</span></button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 4px"}}>
        <div style={{fontSize:13,color:"#6b7280"}}><span style={{fontWeight:700,color:"#111827"}}>{filtered.length}건</span>{query&&<span style={{marginLeft:4}}>"{query}" 결과</span>}</div>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{fontSize:12,border:"1px solid #e2e8f0",borderRadius:8,padding:"5px 8px",background:"white",color:"#374151",outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
          {SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{padding:"6px 14px 80px",display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:9}}>
        {filtered.length===0
          ?<div style={{gridColumn:`span ${cols}`,textAlign:"center",padding:"48px 0",color:"#9ca3af"}}><div style={{fontSize:36,marginBottom:10}}>🔍</div><div style={{fontSize:15,fontWeight:600,color:"#374151",marginBottom:6}}>검색 결과가 없어요</div><div style={{fontSize:13}}>다른 키워드나 카테고리를 시도해 보세요</div></div>
          :filtered.map((p,i)=><PolicyCard key={p.id} policy={p} favIds={favIds} onToggle={onToggleFav} onGoDetail={onGoDetail} delay={i*40}/>)
        }
      </div>
    </div>
  );
}

// ─── 마이페이지: 나의 맞춤 정책 ───────────────────────────────────────────

function CustomPoliciesView({favIds,onToggleFav,onGoDetail,bp,policies}){
  const [ageGroup,setAgeGroup]=useLocalStorage("yoa:age","20대");
  const [interest,setInterest]=useLocalStorage("yoa:interest","all");
  const saved=policies.filter(p=>favIds.has(p.id));
  const recommended=policies.filter(p=>interest==="all"||p.cat===interest).sort((a,b)=>b.views-a.views).slice(0,6);
  const cols=bp.isDesktop?3:bp.isTablet?2:1;

  return(
    <div style={{background:"#f8fafc",minHeight:"100%",padding:bp.isDesktop?"36px 40px":bp.isTablet?"28px 24px":"18px 14px"}}>
      {/* 프로필 카드 */}
      <div style={{background:"linear-gradient(135deg,#1E3A8A,#2563EB)",borderRadius:20,padding:bp.isDesktop?"28px 32px":"20px 18px",marginBottom:24,color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:"-5%",top:"-20%",width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{position:"relative"}}>
          <div style={{fontSize:13,opacity:0.75,marginBottom:6}}>나의 맞춤 정책 설정</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,opacity:0.6,marginBottom:4}}>연령대</div>
              <div style={{display:"flex",gap:6}}>
                {["20대","30대","기타"].map(a=>(
                  <button key={a} onClick={()=>setAgeGroup(a)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:ageGroup===a?"white":"rgba(255,255,255,0.3)",background:ageGroup===a?"rgba(255,255,255,0.25)":"transparent",color:"white",fontSize:12,fontWeight:ageGroup===a?700:400,cursor:"pointer",transition:"all 0.15s"}}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,opacity:0.6,marginBottom:4}}>관심 분야</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {CATEGORIES.map(c=>(
                  <button key={c.value} onClick={()=>setInterest(c.value)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:interest===c.value?"white":"rgba(255,255,255,0.3)",background:interest===c.value?"rgba(255,255,255,0.25)":"transparent",color:"white",fontSize:12,fontWeight:interest===c.value?700:400,cursor:"pointer",transition:"all 0.15s"}}>{c.emoji} {c.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 저장한 정책 */}
      <section style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{fontSize:bp.isDesktop?18:15,fontWeight:800,color:"#111827",margin:0}}>⭐ 저장한 정책 <span style={{fontSize:13,color:"#9ca3af",fontWeight:400}}>({saved.length}건)</span></h2>
        </div>
        {saved.length===0
          ?<div style={{background:"white",borderRadius:16,padding:"32px",textAlign:"center",color:"#9ca3af",border:"1.5px dashed #e5e7eb"}}>
            <div style={{fontSize:32,marginBottom:10}}>☆</div>
            <div style={{fontSize:14,fontWeight:600,color:"#374151",marginBottom:4}}>아직 저장한 정책이 없어요</div>
            <div style={{fontSize:13}}>검색에서 관심 정책을 ☆ 눌러 저장해보세요</div>
          </div>
          :<div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:bp.isDesktop?16:9}}>
            {saved.map((p,i)=><PolicyCard key={p.id} policy={p} favIds={favIds} onToggle={onToggleFav} onGoDetail={onGoDetail} delay={i*60}/>)}
          </div>
        }
      </section>

      {/* 맞춤 추천 */}
      <section>
        <h2 style={{fontSize:bp.isDesktop?18:15,fontWeight:800,color:"#111827",marginBottom:6}}>✨ 맞춤 추천 정책</h2>
        <div style={{fontSize:13,color:"#9ca3af",marginBottom:14}}>{ageGroup} · {interest==="all"?"전체 분야":CAT_LABEL[interest]} 기준</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:bp.isDesktop?16:9}}>
          {recommended.map((p,i)=><PolicyCard key={p.id} policy={p} favIds={favIds} onToggle={onToggleFav} onGoDetail={onGoDetail} delay={i*60}/>)}
        </div>
      </section>
    </div>
  );
}

// ─── 마이페이지: 신청 체크리스트 ─────────────────────────────────────────

function ChecklistView({favIds,onGoDetail,bp,policies}){
  const [checks,setChecks]=useLocalStorage("yoa:checks",{});
  const [open,setOpen]=useState({});
  const saved=policies.filter(p=>favIds.has(p.id));

  const toggle=(pid,idx)=>{
    setChecks(prev=>({...prev,[`${pid}_${idx}`]:!prev[`${pid}_${idx}`]}));
  };
  const progress=pid=>{
    const done=CHECKLIST_STEPS.filter((_,i)=>checks[`${pid}_${i}`]).length;
    return{done,total:CHECKLIST_STEPS.length,pct:Math.round(done/CHECKLIST_STEPS.length*100)};
  };

  if(saved.length===0){
    return(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",textAlign:"center",color:"#9ca3af"}}>
        <div style={{fontSize:48,marginBottom:14}}>✅</div>
        <div style={{fontSize:16,fontWeight:600,color:"#374151",marginBottom:6}}>체크리스트를 작성할 정책이 없어요</div>
        <div style={{fontSize:13}}>나의 맞춤 정책에서 관심 정책을 저장하면<br/>신청 체크리스트를 관리할 수 있어요</div>
      </div>
    );
  }

  return(
    <div style={{background:"#f8fafc",minHeight:"100%",padding:bp.isDesktop?"36px 40px":bp.isTablet?"28px 24px":"18px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h2 style={{fontSize:bp.isDesktop?22:17,fontWeight:800,color:"#111827",margin:0}}>✅ 신청 체크리스트</h2>
        <span style={{fontSize:13,color:"#9ca3af",background:"#f1f5f9",padding:"4px 12px",borderRadius:99}}>{saved.length}개 정책</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:bp.isDesktop?800:"100%"}}>
        {saved.map(p=>{
          const {done,total,pct}=progress(p.id);
          const isOpen=open[p.id];
          const c=CAT_COLORS[p.cat]||{};
          return(
            <div key={p.id} style={{background:"white",borderRadius:18,border:"1.5px solid #f1f5f9",overflow:"hidden",transition:"box-shadow 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.07)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=""}
            >
              {/* 카드 헤더 */}
              <button onClick={()=>setOpen(prev=>({...prev,[p.id]:!prev[p.id]}))} style={{width:"100%",padding:"18px 20px",background:"none",border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:c.bg,border:`1.5px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{CAT_EMOJI[p.cat]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#111827",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:5,background:"#f1f5f9",borderRadius:99,overflow:"hidden",maxWidth:160}}>
                      <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":c.dot||"#3B82F6",borderRadius:99,transition:"width 0.4s ease"}}/>
                    </div>
                    <span style={{fontSize:11,color:pct===100?"#15803d":"#9ca3af",fontWeight:700,whiteSpace:"nowrap"}}>{done}/{total} {pct===100?"완료 🎉":""}</span>
                  </div>
                </div>
                <span style={{fontSize:14,color:"#9ca3af",flexShrink:0,transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
              </button>

              {/* 체크리스트 항목 */}
              {isOpen&&(
                <div style={{padding:"0 20px 18px",borderTop:"1px solid #f8fafc"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:14}}>
                    {CHECKLIST_STEPS.map((step,i)=>{
                      const checked=!!checks[`${p.id}_${i}`];
                      return(
                        <label key={i} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 12px",borderRadius:10,background:checked?"#f0fdf4":"#f8fafc",border:`1px solid ${checked?"#bbf7d0":"#e5e7eb"}`,transition:"all 0.15s"}}>
                          <input type="checkbox" checked={checked} onChange={()=>toggle(p.id,i)} style={{display:"none"}}/>
                          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${checked?"#22c55e":"#d1d5db"}`,background:checked?"#22c55e":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                            {checked&&<span style={{color:"white",fontSize:13,fontWeight:900}}>✓</span>}
                          </div>
                          <span style={{fontSize:14,color:checked?"#15803d":"#374151",fontWeight:checked?600:400,textDecoration:checked?"line-through":"none",transition:"all 0.15s"}}>{step}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button onClick={()=>onGoDetail(p)} style={{marginTop:12,width:"100%",padding:"10px",borderRadius:10,border:"1px solid #e5e7eb",background:"white",color:"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#3B82F6";e.currentTarget.style.color="#1D4ED8";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#6b7280";}}
                  >정책 상세 보기 →</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 마이페이지: 정책 캘린더 ─────────────────────────────────────────────

const WEEKDAYS=["일","월","화","수","목","금","토"];
const MONTH_NAMES=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function CalendarView({onGoDetail,bp,policies}){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [selectedDay,setSelectedDay]=useState(null);

  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDow=new Date(year,month,1).getDay();

  const deadlineMap=useMemo(()=>{
    const m={};
    policies.forEach(p=>{
      if(p.deadline!=="상시"){
        const d=new Date(p.deadline);
        if(d.getFullYear()===year&&d.getMonth()===month){
          const day=d.getDate();
          if(!m[day])m[day]=[];
          m[day].push(p);
        }
      }
    });
    return m;
  },[year,month,policies]);

  const upcoming=policies.filter(p=>{
    if(p.deadline==="상시")return false;
    const d=new Date(p.deadline);
    const diff=Math.ceil((d-Date.now())/86400000);
    return diff>=0&&diff<=90;
  }).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));

  const prevMonth=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);setSelectedDay(null);};
  const nextMonth=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);setSelectedDay(null);};

  const cells=[];
  for(let i=0;i<firstDow;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  while(cells.length%7!==0)cells.push(null);

  const todayDay=now.getFullYear()===year&&now.getMonth()===month?now.getDate():null;
  const selectedPolicies=selectedDay?deadlineMap[selectedDay]||[]:[];

  return(
    <div style={{background:"#f8fafc",minHeight:"100%",padding:bp.isDesktop?"36px 40px":bp.isTablet?"28px 24px":"18px 14px"}}>
      <div style={{display:bp.isDesktop?"grid":"block",gridTemplateColumns:"1fr 300px",gap:28,maxWidth:bp.isDesktop?1000:"100%"}}>
        {/* 캘린더 */}
        <div>
          <div style={{background:"white",borderRadius:20,padding:bp.isDesktop?"24px":"16px",border:"1.5px solid #f1f5f9",marginBottom:bp.isDesktop?0:16}}>
            {/* 월 네비 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <button onClick={prevMonth} style={{width:36,height:36,borderRadius:10,border:"1px solid #e5e7eb",background:"white",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background="white"}
              >‹</button>
              <div style={{fontWeight:800,fontSize:18,color:"#111827"}}>{year}년 {MONTH_NAMES[month]}</div>
              <button onClick={nextMonth} style={{width:36,height:36,borderRadius:10,border:"1px solid #e5e7eb",background:"white",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background="white"}
              >›</button>
            </div>
            {/* 요일 */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
              {WEEKDAYS.map((d,i)=>(
                <div key={d} style={{textAlign:"center",fontSize:12,fontWeight:700,color:i===0?"#ef4444":i===6?"#3B82F6":"#9ca3af",padding:"4px 0"}}>{d}</div>
              ))}
            </div>
            {/* 날짜 */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
              {cells.map((day,i)=>{
                if(!day)return<div key={i}/>;
                const hasDeadline=!!deadlineMap[day];
                const isToday=day===todayDay;
                const isSelected=day===selectedDay;
                const dow=i%7;
                return(
                  <button key={i} onClick={()=>setSelectedDay(day===selectedDay?null:day)} style={{
                    position:"relative",padding:"8px 4px",borderRadius:10,border:"none",cursor:"pointer",
                    background:isSelected?"#1D4ED8":isToday?"#EFF6FF":"transparent",
                    color:isSelected?"white":isToday?"#1D4ED8":dow===0?"#ef4444":dow===6?"#3B82F6":"#374151",
                    fontWeight:isToday||isSelected?700:400,fontSize:13,
                    transition:"all 0.12s",
                  }}
                    onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background="#f8fafc";}}
                    onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background=isToday?"#EFF6FF":"transparent";}}
                  >
                    {day}
                    {hasDeadline&&(
                      <div style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",display:"flex",gap:2}}>
                        {deadlineMap[day].slice(0,3).map((p,pi)=>(
                          <div key={pi} style={{width:5,height:5,borderRadius:"50%",background:isSelected?"rgba(255,255,255,0.8)":CAT_COLORS[p.cat]?.dot||"#3B82F6"}}/>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 범례 */}
            <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}>
              {CATEGORIES.slice(1).map(c=>(
                <div key={c.value} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#6b7280"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:CAT_COLORS[c.value]?.dot}}/>
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* 선택 날짜 정책 */}
          {selectedDay&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:10}}>
                {month+1}월 {selectedDay}일 마감 정책 ({selectedPolicies.length}건)
              </div>
              {selectedPolicies.length===0
                ?<div style={{background:"white",borderRadius:14,padding:"20px",textAlign:"center",color:"#9ca3af",fontSize:13}}>이 날 마감인 정책이 없어요</div>
                :<div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {selectedPolicies.map(p=>(
                    <div key={p.id} onClick={()=>onGoDetail(p)} style={{background:"white",borderRadius:14,padding:"14px 16px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",border:`1.5px solid ${CAT_COLORS[p.cat]?.border||"#e5e7eb"}`,transition:"transform 0.15s,box-shadow 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.07)";}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                    >
                      <div style={{fontSize:22}}>{CAT_EMOJI[p.cat]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13,color:"#111827"}}>{p.title}</div>
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{p.org} · {p.benefit}</div>
                      </div>
                      <span style={{fontSize:12,color:"#dc2626",fontWeight:700,background:"#fef2f2",padding:"3px 8px",borderRadius:20,whiteSpace:"nowrap"}}>D-{daysLeft(p.deadline)}</span>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}
        </div>

        {/* 다가오는 마감 */}
        <div>
          <div style={{background:"white",borderRadius:20,padding:bp.isDesktop?"20px":"16px",border:"1.5px solid #f1f5f9"}}>
            <div style={{fontWeight:800,fontSize:15,color:"#111827",marginBottom:16}}>⏰ 다가오는 마감</div>
            {upcoming.length===0
              ?<div style={{textAlign:"center",padding:"24px 0",color:"#9ca3af",fontSize:13}}>90일 내 마감 정책이 없어요</div>
              :<div style={{display:"flex",flexDirection:"column",gap:10}}>
                {upcoming.slice(0,8).map(p=>{
                  const d2=daysLeft(p.deadline);
                  return(
                    <div key={p.id} onClick={()=>onGoDetail(p)} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",borderRadius:12,cursor:"pointer",transition:"background 0.12s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <div style={{width:34,height:34,borderRadius:10,background:CAT_COLORS[p.cat]?.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{CAT_EMOJI[p.cat]}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{p.deadline}</div>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:d2<=14?"#dc2626":d2<=30?"#d97706":"#6b7280",background:d2<=14?"#fef2f2":d2<=30?"#fffbeb":"#f8fafc",padding:"2px 7px",borderRadius:99,flexShrink:0}}>D-{d2}</span>
                    </div>
                  );
                })}
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 마이페이지 컨테이너 ──────────────────────────────────────────────────

function MyPageView({favIds,onToggleFav,onGoDetail,bp,policies}){
  const [sub,setSub]=useLocalStorage("yoa:mysub","custom");
  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100%"}}>
      {/* 서브 탭 */}
      <div style={{background:"white",borderBottom:"1px solid #e5e7eb",padding: bp.isDesktop?"0 40px":"0",flexShrink:0}}>
        <div style={{display:"flex",overflowX:"auto",gap:0}}>
          {MY_SUB_PAGES.map(s=>(
            <button key={s.sub} onClick={()=>setSub(s.sub)} style={{
              padding: bp.isDesktop?"14px 20px":"11px 14px",
              border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",
              fontSize: bp.isDesktop?14:13,fontWeight:sub===s.sub?700:500,
              color:sub===s.sub?"#1D4ED8":"#6b7280",
              borderBottom:`2.5px solid ${sub===s.sub?"#1D4ED8":"transparent"}`,
              transition:"all 0.15s",
            }}>{s.icon} {s.label}</button>
          ))}
        </div>
      </div>
      {/* 서브 뷰 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {sub==="custom"    && <CustomPoliciesView favIds={favIds} onToggleFav={onToggleFav} onGoDetail={onGoDetail} bp={bp} policies={policies}/>}
        {sub==="checklist" && <ChecklistView favIds={favIds} onGoDetail={onGoDetail} bp={bp} policies={policies}/>}
        {sub==="calendar"  && <CalendarView onGoDetail={onGoDetail} bp={bp} policies={policies}/>}
      </div>
    </div>
  );
}

// ─── 커뮤니티 글쓰기 뷰 ──────────────────────────────────────────────────

const CAT_COLOR_MAP={후기:{bg:"#F0FDF4",border:"#BBF7D0",text:"#15803D"},정보:{bg:"#EFF6FF",border:"#BFDBFE",text:"#1D4ED8"},"Q&A":{bg:"#FFF1F2",border:"#FECDD3",text:"#BE123C"}};

function CommunityWriteView({bp,onSubmit,onCancel}){
  const [cat,setCat]=useState("후기");
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  const [author,setAuthor]=useState("");
  const [errors,setErrors]=useState({});
  const cats=["후기","정보","Q&A"];

  const validate=()=>{
    const e={};
    if(!author.trim())e.author="닉네임을 입력해주세요.";
    if(!title.trim())e.title="제목을 입력해주세요.";
    if(!content.trim())e.content="내용을 입력해주세요.";
    else if(content.trim().length<10)e.content="내용을 10자 이상 입력해주세요.";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSubmit=e=>{
    e.preventDefault();
    if(!validate())return;
    const today=new Date().toISOString().split("T")[0];
    onSubmit({id:Date.now(),cat,title:title.trim(),author:author.trim(),date:today,likes:0,comments:0,preview:content.trim().slice(0,80)+(content.trim().length>80?"...":""),content:content.trim()});
  };

  const inp={width:"100%",padding:"12px 14px",borderRadius:10,fontSize:14,outline:"none",transition:"border-color 0.15s",boxSizing:"border-box",fontFamily:"inherit"};

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:bp.isDesktop?"36px 40px 28px":bp.isTablet?"28px 24px 20px":"22px 16px 16px",color:"white",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onCancel} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:10,color:"white",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18,flexShrink:0,transition:"background 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.22)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
        >←</button>
        <div>
          <div style={{fontSize:12,opacity:0.6,marginBottom:4}}>청년 정책 커뮤니티</div>
          <h1 style={{fontSize:bp.isDesktop?24:bp.isTablet?20:17,fontWeight:900,margin:0,letterSpacing:"-0.02em"}}>새 글 작성 ✏️</h1>
        </div>
      </div>
      <div style={{padding:bp.isDesktop?"32px 40px 60px":bp.isTablet?"24px 24px 60px":"18px 14px 80px"}}>
        <form onSubmit={handleSubmit} style={{maxWidth:bp.isDesktop?700:"100%",display:"flex",flexDirection:"column",gap:20}}>
          <div>
            <label style={{display:"block",fontSize:13,fontWeight:700,color:"#374151",marginBottom:8}}>카테고리</label>
            <div style={{display:"flex",gap:8}}>
              {cats.map(c=>{const cc=CAT_COLOR_MAP[c];const sel=cat===c;return(
                <button key={c} type="button" onClick={()=>setCat(c)} style={{padding:"8px 18px",borderRadius:20,fontSize:13,fontWeight:sel?700:500,cursor:"pointer",transition:"all 0.15s",background:sel?cc.bg:"white",border:`1.5px solid ${sel?cc.border:"#e5e7eb"}`,color:sel?cc.text:"#9ca3af"}}>{c}</button>
              );})}
            </div>
          </div>
          <div>
            <label style={{display:"block",fontSize:13,fontWeight:700,color:"#374151",marginBottom:8}}>닉네임</label>
            <input type="text" value={author} onChange={e=>setAuthor(e.target.value)} placeholder="사용할 닉네임을 입력하세요" maxLength={20}
              style={{...inp,border:`1.5px solid ${errors.author?"#fca5a5":"#e5e7eb"}`,background:errors.author?"#fff8f8":"white"}}
              onFocus={e=>e.target.style.borderColor=errors.author?"#f87171":"#6b7280"} onBlur={e=>e.target.style.borderColor=errors.author?"#fca5a5":"#e5e7eb"}
            />
            {errors.author&&<p style={{fontSize:12,color:"#dc2626",margin:"5px 0 0"}}>{errors.author}</p>}
          </div>
          <div>
            <label style={{display:"block",fontSize:13,fontWeight:700,color:"#374151",marginBottom:8}}>제목</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목을 입력하세요 (최대 50자)" maxLength={50}
              style={{...inp,border:`1.5px solid ${errors.title?"#fca5a5":"#e5e7eb"}`,background:errors.title?"#fff8f8":"white"}}
              onFocus={e=>e.target.style.borderColor=errors.title?"#f87171":"#6b7280"} onBlur={e=>e.target.style.borderColor=errors.title?"#fca5a5":"#e5e7eb"}
            />
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              {errors.title?<p style={{fontSize:12,color:"#dc2626",margin:0}}>{errors.title}</p>:<span/>}
              <span style={{fontSize:11,color:"#9ca3af"}}>{title.length}/50</span>
            </div>
          </div>
          <div>
            <label style={{display:"block",fontSize:13,fontWeight:700,color:"#374151",marginBottom:8}}>내용</label>
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="정책 신청 후기, 꿀팁, 질문 등을 자유롭게 작성해보세요 (최소 10자)" maxLength={2000} rows={bp.isDesktop?10:7}
              style={{...inp,resize:"vertical",lineHeight:1.7,border:`1.5px solid ${errors.content?"#fca5a5":"#e5e7eb"}`,background:errors.content?"#fff8f8":"white"}}
              onFocus={e=>e.target.style.borderColor=errors.content?"#f87171":"#6b7280"} onBlur={e=>e.target.style.borderColor=errors.content?"#fca5a5":"#e5e7eb"}
            />
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              {errors.content?<p style={{fontSize:12,color:"#dc2626",margin:0}}>{errors.content}</p>:<span/>}
              <span style={{fontSize:11,color:"#9ca3af"}}>{content.length}/2000</span>
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
            <button type="button" onClick={onCancel} style={{padding:"11px 24px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"white",color:"#374151",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#111827";e.currentTarget.style.color="#111827";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#374151";}}
            >취소</button>
            <button type="submit" style={{padding:"11px 28px",borderRadius:10,border:"none",background:"#111827",color:"white",fontSize:14,fontWeight:700,cursor:"pointer",transition:"opacity 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}
            >게시하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 커뮤니티 상세 뷰 ─────────────────────────────────────────────────────

function CommunityPostDetailView({post,bp,onBack,onLike}){
  const [comments,setComments]=useLocalStorage(`yoa:comments_${post.id}`,[]);
  const [liked,setLiked]=useLocalStorage(`yoa:liked_${post.id}`,false);
  const [commentText,setCommentText]=useState("");
  const [commentAuthor,setCommentAuthor]=useState("");
  const [commentError,setCommentError]=useState("");
  const cc=CAT_COLOR_MAP[post.cat]||{bg:"#f8fafc",border:"#e5e7eb",text:"#6b7280"};
  const totalComments=comments.length+(post.comments||0);
  const body=post.content||post.preview||"";

  const handleLike=()=>{
    if(liked)return;
    setLiked(true);
    onLike(post.id);
  };

  const handleComment=e=>{
    e.preventDefault();
    if(!commentAuthor.trim()){setCommentError("닉네임을 입력해주세요.");return;}
    if(!commentText.trim()){setCommentError("댓글 내용을 입력해주세요.");return;}
    setCommentError("");
    setComments(prev=>[...prev,{id:Date.now(),author:commentAuthor.trim(),content:commentText.trim(),date:new Date().toISOString().split("T")[0]}]);
    setCommentText("");
  };

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:bp.isDesktop?"36px 40px 32px":bp.isTablet?"28px 24px 24px":"22px 16px 20px",color:"white"}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.12)",border:"none",borderRadius:10,color:"white",padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:20,transition:"background 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.22)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
        >← 목록으로</button>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:cc.bg,color:cc.text,border:`1px solid ${cc.border}`}}>{post.cat}</span>
          <span style={{fontSize:12,opacity:0.55}}>{post.date}</span>
        </div>
        <h1 style={{fontSize:bp.isDesktop?26:bp.isTablet?22:18,fontWeight:900,margin:"0 0 16px",lineHeight:1.35,letterSpacing:"-0.02em"}}>{post.title}</h1>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{post.author?.[0]||"?"}</div>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>{post.author}</div>
            <div style={{fontSize:11,opacity:0.5}}>작성자</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:14}}>
            <span style={{fontSize:13,opacity:0.7,display:"flex",alignItems:"center",gap:4}}>❤️ {(post.likes||0)+(liked?1:0)}</span>
            <span style={{fontSize:13,opacity:0.7,display:"flex",alignItems:"center",gap:4}}>💬 {totalComments}</span>
          </div>
        </div>
      </div>
      <div style={{padding:bp.isDesktop?"32px 40px":bp.isTablet?"24px 24px":"18px 14px",maxWidth:bp.isDesktop?760:"100%"}}>
        <div style={{background:"white",borderRadius:16,padding:bp.isDesktop?"28px 32px":bp.isTablet?"22px 24px":"18px 18px",border:"1.5px solid #f1f5f9",fontSize:bp.isDesktop?15:14,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
          {body}
        </div>
        <div style={{display:"flex",justifyContent:"center",margin:"24px 0"}}>
          <button onClick={handleLike} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 28px",borderRadius:30,fontSize:14,fontWeight:700,cursor:liked?"default":"pointer",border:`2px solid ${liked?"#fca5a5":"#e5e7eb"}`,background:liked?"#fff1f2":"white",color:liked?"#dc2626":"#6b7280",transition:"all 0.2s"}}
            onMouseEnter={e=>{if(!liked){e.currentTarget.style.borderColor="#fca5a5";e.currentTarget.style.color="#dc2626";e.currentTarget.style.background="#fff1f2";}}}
            onMouseLeave={e=>{if(!liked){e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#6b7280";e.currentTarget.style.background="white";}}}
          ><span style={{fontSize:18}}>{liked?"❤️":"🤍"}</span>{liked?"공감했어요":"공감해요"} {(post.likes||0)+(liked?1:0)}</button>
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:"#111827",marginBottom:16}}>댓글 {totalComments}개</div>
          <form onSubmit={handleComment} style={{background:"white",borderRadius:14,padding:bp.isDesktop?"20px 24px":"16px 18px",border:"1.5px solid #f1f5f9",marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
            <input type="text" placeholder="닉네임" value={commentAuthor} onChange={e=>setCommentAuthor(e.target.value)} maxLength={20}
              style={{padding:"9px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor="#6b7280"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}
            />
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <textarea placeholder="댓글을 입력하세요" value={commentText} onChange={e=>setCommentText(e.target.value)} rows={2} maxLength={500}
                style={{flex:1,padding:"9px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.6,boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor="#6b7280"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}
              />
              <button type="submit" style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#111827",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"opacity 0.15s",alignSelf:"stretch"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >등록</button>
            </div>
            {commentError&&<p style={{fontSize:12,color:"#dc2626",margin:0}}>{commentError}</p>}
          </form>
          {post.comments>0&&comments.length===0&&(
            <div style={{textAlign:"center",padding:"16px",color:"#9ca3af",fontSize:13,background:"white",borderRadius:12,border:"1.5px solid #f1f5f9",marginBottom:10}}>
              댓글 {post.comments}개 · 로그인 후 전체 댓글을 확인할 수 있어요
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8,paddingBottom:bp.isMobile?80:40}}>
            {comments.map(c=>(
              <div key={c.id} style={{background:"white",borderRadius:12,padding:bp.isDesktop?"16px 20px":"13px 16px",border:"1.5px solid #f1f5f9"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#374151",flexShrink:0}}>{c.author?.[0]||"?"}</div>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{c.author}</span>
                  <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{c.date}</span>
                </div>
                <div style={{fontSize:13,color:"#374151",lineHeight:1.65,paddingLeft:34}}>{c.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 커뮤니티 뷰 ──────────────────────────────────────────────────────────

function CommunityView({bp}){
  const [catFilter,setCatFilter]=useState("전체");
  const [showWrite,setShowWrite]=useState(false);
  const [selectedPost,setSelectedPost]=useState(null);
  const [posts,setPosts]=useLocalStorage("yoa:community_posts",COMMUNITY_POSTS);
  const cats=["전체","후기","정보","Q&A"];
  const filtered=posts.filter(p=>catFilter==="전체"||p.cat===catFilter);

  const handleAddPost=useCallback(newPost=>{
    setPosts(prev=>[newPost,...prev]);
    setShowWrite(false);
  },[setPosts]);

  const handleLike=useCallback(id=>{
    setPosts(prev=>prev.map(p=>p.id===id?{...p,likes:(p.likes||0)+1}:p));
  },[setPosts]);

  if(showWrite)return <CommunityWriteView bp={bp} onSubmit={handleAddPost} onCancel={()=>setShowWrite(false)}/>;
  if(selectedPost){
    const livePost=posts.find(p=>p.id===selectedPost.id)||selectedPost;
    return <CommunityPostDetailView post={livePost} bp={bp} onBack={()=>setSelectedPost(null)} onLike={handleLike}/>;
  }

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:bp.isDesktop?"36px 40px 28px":bp.isTablet?"28px 24px 20px":"22px 16px 16px",color:"white"}}>
        <div style={{fontSize:12,opacity:0.6,marginBottom:8}}>청년 정책 커뮤니티</div>
        <h1 style={{fontSize:bp.isDesktop?32:bp.isTablet?24:20,fontWeight:900,margin:"0 0 8px",letterSpacing:"-0.02em"}}>함께 나누는 정책 이야기 💬</h1>
        <p style={{fontSize:bp.isDesktop?15:13,opacity:0.7,margin:0}}>실제 신청 후기, 꿀팁, 궁금한 점을 자유롭게 나눠보세요</p>
      </div>
      <div style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:bp.isDesktop?"0 40px":"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:0,overflowX:"auto"}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)} style={{padding:bp.isDesktop?"13px 18px":"11px 14px",border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:bp.isDesktop?14:13,fontWeight:catFilter===c?700:500,color:catFilter===c?"#111827":"#9ca3af",borderBottom:`2.5px solid ${catFilter===c?"#111827":"transparent"}`,transition:"all 0.15s"}}>{c}</button>
          ))}
        </div>
        <button onClick={()=>setShowWrite(true)} style={{padding:"7px 16px",borderRadius:20,background:"#111827",border:"none",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"opacity 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}
        >+ 글쓰기</button>
      </div>
      <div style={{padding:bp.isDesktop?"28px 40px 60px":bp.isTablet?"20px 24px 60px":"14px 14px 80px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:bp.isDesktop?800:"100%"}}>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"60px 20px",color:"#9ca3af"}}>
              <div style={{fontSize:36,marginBottom:12}}>📝</div>
              <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>아직 게시글이 없어요</div>
              <div style={{fontSize:13}}>첫 번째 글을 작성해보세요!</div>
            </div>
          )}
          {filtered.map((post,i)=>{
            const catColor=CAT_COLOR_MAP[post.cat]||{bg:"#f8fafc",border:"#e5e7eb",text:"#6b7280"};
            return(
              <div key={post.id} onClick={()=>setSelectedPost(post)} style={{background:"white",borderRadius:16,padding:bp.isDesktop?"20px 24px":"14px 16px",cursor:"pointer",border:"1.5px solid #f1f5f9",transition:"transform 0.15s,box-shadow 0.15s",animation:`fadeUp 0.25s ease ${i*50}ms both`}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.07)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
              >
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,background:catColor.bg,border:`1px solid ${catColor.border}`,color:catColor.text}}>{post.cat}</span>
                      <span style={{fontSize:11,color:"#9ca3af"}}>{post.date}</span>
                    </div>
                    <div style={{fontWeight:700,fontSize:bp.isDesktop?15:14,color:"#111827",lineHeight:1.4,marginBottom:6}}>{post.title}</div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{post.preview}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14,marginTop:12,paddingTop:12,borderTop:"1px solid #f8fafc"}}>
                  <span style={{fontSize:12,color:"#9ca3af"}}>by <span style={{color:"#374151",fontWeight:600}}>{post.author}</span></span>
                  <div style={{marginLeft:"auto",display:"flex",gap:12}}>
                    <span style={{fontSize:12,color:"#9ca3af",display:"flex",alignItems:"center",gap:3}}>❤️ {post.likes}</span>
                    <span style={{fontSize:12,color:"#9ca3af",display:"flex",alignItems:"center",gap:3}}>💬 {post.comments}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 로그인 페이지 ────────────────────────────────────────────────────────

function LoginPage({setPage,bp}){
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [error,setError]=useState("");

  const handleSubmit=e=>{
    e.preventDefault();
    if(!email){setError("이메일을 입력해주세요.");return;}
    if(!pw){setError("비밀번호를 입력해주세요.");return;}
    setError("준비 중인 기능입니다.");
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      {/* 왼쪽 브랜드 패널 (데스크탑만) */}
      {bp.isDesktop&&(
        <div style={{width:480,background:"linear-gradient(160deg,#0f172a 0%,#1e3a8a 60%,#2563eb 100%)",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 56px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:"-15%",top:"-10%",width:400,height:400,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
          <div style={{position:"absolute",left:"-10%",bottom:"-10%",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:48}}>
              <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏛️</div>
              <div style={{fontWeight:900,fontSize:22,color:"white",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
            <h2 style={{fontSize:36,fontWeight:900,color:"white",margin:"0 0 16px",lineHeight:1.25,letterSpacing:"-0.02em"}}>청년 정책,<br/>이제 한눈에</h2>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.65)",lineHeight:1.8,margin:"0 0 40px"}}>취업·주거·금융·교육·건강까지<br/>나에게 맞는 청년 지원 정책을 찾아보세요.</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[{icon:"💼",text:"12개 이상의 청년 지원 정책 안내"},{icon:"⭐",text:"맞춤 정책 저장 및 체크리스트"},{icon:"📅",text:"마감일 캘린더로 놓치지 않게"}].map(({icon,text})=>(
                <div key={text} style={{display:"flex",alignItems:"center",gap:10,color:"rgba(255,255,255,0.8)",fontSize:14}}>
                  <span style={{fontSize:18}}>{icon}</span>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 오른쪽 로그인 폼 */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc",padding:bp.isMobile?"24px 20px":"40px"}}>
        <div style={{width:"100%",maxWidth:400}}>
          {/* 모바일 로고 */}
          {!bp.isDesktop&&(
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:36,justifyContent:"center"}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#1e293b,#0f172a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏛️</div>
              <div style={{fontWeight:900,fontSize:20,color:"#111827",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
          )}

          <div style={{background:"white",borderRadius:20,padding:bp.isMobile?"28px 24px":"36px 40px",boxShadow:"0 4px 40px rgba(0,0,0,0.08)",border:"1.5px solid #f1f5f9"}}>
            <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:"0 0 6px",letterSpacing:"-0.02em"}}>로그인</h1>
            <p style={{fontSize:13,color:"#9ca3af",margin:"0 0 28px"}}>계정이 없으신가요? <button onClick={()=>setPage("signup")} style={{background:"none",border:"none",color:"#1D4ED8",fontSize:13,fontWeight:700,cursor:"pointer",padding:0}}>회원가입</button></p>

            <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:13,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>이메일</label>
                <input
                  type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                  placeholder="example@email.com"
                  style={{width:"100%",padding:"12px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.15s",background:"#f8fafc"}}
                  onFocus={e=>e.target.style.borderColor="#3B82F6"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                />
              </div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <label style={{fontSize:13,fontWeight:600,color:"#374151"}}>비밀번호</label>
                  <button type="button" style={{background:"none",border:"none",color:"#6b7280",fontSize:12,cursor:"pointer",padding:0}}>비밀번호 찾기</button>
                </div>
                <div style={{position:"relative"}}>
                  <input
                    type={showPw?"text":"password"} value={pw} onChange={e=>{setPw(e.target.value);setError("");}}
                    placeholder="비밀번호를 입력해주세요"
                    style={{width:"100%",padding:"12px 44px 12px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.15s",background:"#f8fafc"}}
                    onFocus={e=>e.target.style.borderColor="#3B82F6"}
                    onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                  />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af",padding:4}}>
                    {showPw?"🙈":"👁️"}
                  </button>
                </div>
              </div>

              {error&&<div style={{fontSize:13,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}>{error}</div>}

              <button type="submit" style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#1e3a8a,#2563eb)",color:"white",fontSize:15,fontWeight:800,cursor:"pointer",marginTop:4,transition:"opacity 0.15s",boxShadow:"0 4px 20px rgba(37,99,235,0.35)"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.9"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >로그인</button>
            </form>

            <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>또는</span>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{emoji:"🟡",label:"카카오로 계속하기",bg:"#FEE500",color:"#191919"},{emoji:"🟢",label:"네이버로 계속하기",bg:"#03C75A",color:"white"}].map(({emoji,label,bg,color})=>(
                <button key={label} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:bg,color,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"opacity 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                >{emoji} {label}</button>
              ))}
            </div>
          </div>

          <button onClick={()=>setPage("search")} style={{display:"block",margin:"20px auto 0",background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer",padding:"8px 16px"}}>
            ← 메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 회원가입 페이지 ──────────────────────────────────────────────────────

function SignupPage({setPage,bp}){
  const [form,setForm]=useState({name:"",email:"",pw:"",pwConfirm:""});
  const [showPw,setShowPw]=useState(false);
  const [agreed,setAgreed]=useState(false);
  const [errors,setErrors]=useState({});

  const set=k=>e=>setForm(prev=>({...prev,[k]:e.target.value}));

  const validate=()=>{
    const e={};
    if(!form.name.trim())e.name="이름을 입력해주세요.";
    if(!form.email.includes("@"))e.email="올바른 이메일 형식을 입력해주세요.";
    if(form.pw.length<8)e.pw="비밀번호는 8자 이상이어야 합니다.";
    if(form.pw!==form.pwConfirm)e.pwConfirm="비밀번호가 일치하지 않습니다.";
    if(!agreed)e.agreed="이용약관에 동의해주세요.";
    return e;
  };

  const handleSubmit=e=>{
    e.preventDefault();
    const e2=validate();
    if(Object.keys(e2).length){setErrors(e2);return;}
    setErrors({msg:"준비 중인 기능입니다."});
  };

  const inputStyle={width:"100%",padding:"12px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.15s",background:"#f8fafc"};
  const labelStyle={fontSize:13,fontWeight:600,color:"#374151",display:"block",marginBottom:6};
  const errStyle={fontSize:12,color:"#dc2626",marginTop:4};

  return(
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      {bp.isDesktop&&(
        <div style={{width:480,background:"linear-gradient(160deg,#0f172a 0%,#14532d 60%,#16a34a 100%)",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 56px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:"-15%",top:"-10%",width:400,height:400,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
          <div style={{position:"absolute",left:"-10%",bottom:"-10%",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:48}}>
              <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏛️</div>
              <div style={{fontWeight:900,fontSize:22,color:"white",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
            <h2 style={{fontSize:36,fontWeight:900,color:"white",margin:"0 0 16px",lineHeight:1.25,letterSpacing:"-0.02em"}}>지금 시작하세요,<br/>청년 혜택을</h2>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.65)",lineHeight:1.8,margin:"0 0 40px"}}>가입 후 나에게 맞는 청년 정책을<br/>한눈에 확인하고 놓치지 마세요.</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[{icon:"✨",text:"맞춤 정책 추천 서비스"},{icon:"🔔",text:"마감 임박 정책 알림"},{icon:"✅",text:"신청 체크리스트 관리"}].map(({icon,text})=>(
                <div key={text} style={{display:"flex",alignItems:"center",gap:10,color:"rgba(255,255,255,0.8)",fontSize:14}}>
                  <span style={{fontSize:18}}>{icon}</span>{text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc",padding:bp.isMobile?"24px 20px":"40px",overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:400}}>
          {!bp.isDesktop&&(
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:36,justifyContent:"center"}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#1e293b,#0f172a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏛️</div>
              <div style={{fontWeight:900,fontSize:20,color:"#111827",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
          )}

          <div style={{background:"white",borderRadius:20,padding:bp.isMobile?"28px 24px":"36px 40px",boxShadow:"0 4px 40px rgba(0,0,0,0.08)",border:"1.5px solid #f1f5f9"}}>
            <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:"0 0 6px",letterSpacing:"-0.02em"}}>회원가입</h1>
            <p style={{fontSize:13,color:"#9ca3af",margin:"0 0 28px"}}>이미 계정이 있으신가요? <button onClick={()=>setPage("login")} style={{background:"none",border:"none",color:"#1D4ED8",fontSize:13,fontWeight:700,cursor:"pointer",padding:0}}>로그인</button></p>

            <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelStyle}>이름</label>
                <input value={form.name} onChange={set("name")} placeholder="홍길동"
                  style={{...inputStyle,borderColor:errors.name?"#fca5a5":"#e2e8f0"}}
                  onFocus={e=>e.target.style.borderColor="#3B82F6"}
                  onBlur={e=>e.target.style.borderColor=errors.name?"#fca5a5":"#e2e8f0"}
                />
                {errors.name&&<div style={errStyle}>{errors.name}</div>}
              </div>
              <div>
                <label style={labelStyle}>이메일</label>
                <input type="email" value={form.email} onChange={set("email")} placeholder="example@email.com"
                  style={{...inputStyle,borderColor:errors.email?"#fca5a5":"#e2e8f0"}}
                  onFocus={e=>e.target.style.borderColor="#3B82F6"}
                  onBlur={e=>e.target.style.borderColor=errors.email?"#fca5a5":"#e2e8f0"}
                />
                {errors.email&&<div style={errStyle}>{errors.email}</div>}
              </div>
              <div>
                <label style={labelStyle}>비밀번호</label>
                <div style={{position:"relative"}}>
                  <input type={showPw?"text":"password"} value={form.pw} onChange={set("pw")} placeholder="8자 이상 입력해주세요"
                    style={{...inputStyle,paddingRight:44,borderColor:errors.pw?"#fca5a5":"#e2e8f0"}}
                    onFocus={e=>e.target.style.borderColor="#3B82F6"}
                    onBlur={e=>e.target.style.borderColor=errors.pw?"#fca5a5":"#e2e8f0"}
                  />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af",padding:4}}>{showPw?"🙈":"👁️"}</button>
                </div>
                {errors.pw&&<div style={errStyle}>{errors.pw}</div>}
              </div>
              <div>
                <label style={labelStyle}>비밀번호 확인</label>
                <input type={showPw?"text":"password"} value={form.pwConfirm} onChange={set("pwConfirm")} placeholder="비밀번호를 다시 입력해주세요"
                  style={{...inputStyle,borderColor:errors.pwConfirm?"#fca5a5":"#e2e8f0"}}
                  onFocus={e=>e.target.style.borderColor="#3B82F6"}
                  onBlur={e=>e.target.style.borderColor=errors.pwConfirm?"#fca5a5":"#e2e8f0"}
                />
                {errors.pwConfirm&&<div style={errStyle}>{errors.pwConfirm}</div>}
              </div>

              <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginTop:4}}>
                <div onClick={()=>setAgreed(v=>!v)} style={{width:20,height:20,borderRadius:6,border:`2px solid ${agreed?"#1D4ED8":"#d1d5db"}`,background:agreed?"#1D4ED8":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
                  {agreed&&<span style={{color:"white",fontSize:12,fontWeight:900}}>✓</span>}
                </div>
                <span style={{fontSize:13,color:"#374151",lineHeight:1.6}}>
                  <span style={{color:"#1D4ED8",fontWeight:600,cursor:"pointer"}}>이용약관</span> 및 <span style={{color:"#1D4ED8",fontWeight:600,cursor:"pointer"}}>개인정보처리방침</span>에 동의합니다.
                </span>
              </label>
              {errors.agreed&&<div style={{...errStyle,marginTop:-8}}>{errors.agreed}</div>}
              {errors.msg&&<div style={{fontSize:13,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}>{errors.msg}</div>}

              <button type="submit" style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#14532d,#16a34a)",color:"white",fontSize:15,fontWeight:800,cursor:"pointer",marginTop:4,transition:"opacity 0.15s",boxShadow:"0 4px 20px rgba(22,163,74,0.35)"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.9"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >가입하기</button>
            </form>

            <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>또는</span>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{emoji:"🟡",label:"카카오로 계속하기",bg:"#FEE500",color:"#191919"},{emoji:"🟢",label:"네이버로 계속하기",bg:"#03C75A",color:"white"}].map(({emoji,label,bg,color})=>(
                <button key={label} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:bg,color,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"opacity 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                >{emoji} {label}</button>
              ))}
            </div>
          </div>

          <button onClick={()=>setPage("search")} style={{display:"block",margin:"20px auto 0",background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer",padding:"8px 16px"}}>
            ← 메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 네비게이션 ────────────────────────────────────────────────────────────

function Sidebar({page,setPage,favIds}){
  const [mypageOpen,setMypageOpen]=useLocalStorage("yoa:sidebar-mypage",true);
  const [mySub,setMySub]=useLocalStorage("yoa:mysub","custom");
  const mainPage=page==="detail"?"":page.split("-")[0];

  return(
    <aside style={{width:240,flexShrink:0,height:"100vh",position:"sticky",top:0,background:"linear-gradient(180deg,#0f172a 0%,#1e293b 100%)",display:"flex",flexDirection:"column",padding:"28px 16px 24px",overflowY:"auto"}}>
      <button onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:10,marginBottom:36,paddingLeft:8,background:"none",border:"none",cursor:"pointer",padding:"0 0 0 8px"}}>
        <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏛️</div>
        <div>
          <div style={{fontWeight:900,fontSize:17,color:"#fff",letterSpacing:"-0.03em"}}>청년ON</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:1}}>청년정책 안내</div>
        </div>
      </button>

      <nav style={{display:"flex",flexDirection:"column",gap:2,flex:1}}>
        {/* 검색 */}
        <button onClick={()=>setPage("search")} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,border:"none",cursor:"pointer",background:mainPage==="search"?"rgba(255,255,255,0.14)":"transparent",color:mainPage==="search"?"#fff":"rgba(255,255,255,0.6)",fontSize:14,fontWeight:mainPage==="search"?700:400,transition:"all 0.15s",textAlign:"left",borderLeft:mainPage==="search"?"3px solid #fff":"3px solid transparent"}}>
          <span style={{fontSize:18}}>🔍</span> 검색
        </button>

        {/* AI 챗봇 */}
        <button onClick={()=>setPage("chatbot")} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,border:"none",cursor:"pointer",background:mainPage==="chatbot"?"rgba(255,255,255,0.14)":"transparent",color:mainPage==="chatbot"?"#fff":"rgba(255,255,255,0.6)",fontSize:14,fontWeight:mainPage==="chatbot"?700:400,transition:"all 0.15s",textAlign:"left",borderLeft:mainPage==="chatbot"?"3px solid #fff":"3px solid transparent"}}>
          <span style={{fontSize:18}}>🤖</span> AI 챗봇
        </button>

        {/* 마이페이지 (토글) */}
        <div>
          <button onClick={()=>{setMypageOpen(o=>!o);if(mainPage!=="mypage")setPage("mypage");}} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,border:"none",cursor:"pointer",width:"100%",background:mainPage==="mypage"?"rgba(255,255,255,0.14)":"transparent",color:mainPage==="mypage"?"#fff":"rgba(255,255,255,0.6)",fontSize:14,fontWeight:mainPage==="mypage"?700:400,transition:"all 0.15s",textAlign:"left",borderLeft:mainPage==="mypage"?"3px solid #fff":"3px solid transparent"}}>
            <span style={{fontSize:18}}>👤</span>
            <span style={{flex:1}}>마이페이지</span>
            <span style={{fontSize:11,transition:"transform 0.2s",transform:mypageOpen?"rotate(180deg)":"rotate(0deg)",color:"rgba(255,255,255,0.4)"}}>▼</span>
          </button>
          {mypageOpen&&(
            <div style={{marginLeft:16,marginTop:2,display:"flex",flexDirection:"column",gap:1}}>
              {MY_SUB_PAGES.map(s=>(
                <button key={s.sub} onClick={()=>{setPage("mypage");setMySub(s.sub);}} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",borderRadius:10,border:"none",cursor:"pointer",background:mainPage==="mypage"&&mySub===s.sub?"rgba(255,255,255,0.1)":"transparent",color:mainPage==="mypage"&&mySub===s.sub?"#fff":"rgba(255,255,255,0.5)",fontSize:13,fontWeight:mainPage==="mypage"&&mySub===s.sub?600:400,transition:"all 0.15s",textAlign:"left"}}>
                  <span>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 커뮤니티 */}
        <button onClick={()=>setPage("community")} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,border:"none",cursor:"pointer",background:mainPage==="community"?"rgba(255,255,255,0.14)":"transparent",color:mainPage==="community"?"#fff":"rgba(255,255,255,0.6)",fontSize:14,fontWeight:mainPage==="community"?700:400,transition:"all 0.15s",textAlign:"left",borderLeft:mainPage==="community"?"3px solid #fff":"3px solid transparent"}}>
          <span style={{fontSize:18}}>💬</span> 커뮤니티
        </button>
      </nav>

      <div style={{marginTop:20,padding:"14px",background:"rgba(255,255,255,0.07)",borderRadius:14}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>저장 현황</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:700}}>⭐ {favIds.size}개 정책 저장 중</div>
      </div>
      <div style={{marginTop:14,fontSize:10,color:"rgba(255,255,255,0.3)",textAlign:"center"}}>© 2025 청년ON</div>
    </aside>
  );
}

function TopNav({page,setPage,favIds}){
  const mainPage=page==="detail"?"":["search","chatbot","mypage","community"].find(p=>page.startsWith(p))||"search";
  return(
    <header style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:"0 20px",position:"sticky",top:0,zIndex:50}}>
      <div style={{height:56,display:"flex",alignItems:"center",gap:0}}>
        <button onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:9,marginRight:24,background:"none",border:"none",cursor:"pointer",padding:0}}>
          <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#1e293b,#0f172a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏛️</div>
          <div style={{fontWeight:900,fontSize:15,color:"#111827"}}>청년ON</div>
        </button>
        <nav style={{display:"flex",gap:2,flex:1}}>
          {NAV_ITEMS.map(n=>(
            <button key={n.page} onClick={()=>setPage(n.page)} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",background:mainPage===n.page?"#f8fafc":"transparent",color:mainPage===n.page?"#111827":"#6b7280",fontSize:13,fontWeight:mainPage===n.page?700:500,transition:"all 0.15s"}}>
              {n.icon} {n.label}
              {n.page==="mypage"&&favIds.size>0&&<span style={{marginLeft:4,fontSize:11,background:"#1D4ED8",color:"#fff",borderRadius:99,padding:"1px 6px"}}>{favIds.size}</span>}
            </button>
          ))}
        </nav>
        <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:8}}>
          <button onClick={()=>setPage("signup")} style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"white",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#111827";e.currentTarget.style.color="#111827";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#374151";}}
          >회원가입</button>
          <button onClick={()=>setPage("login")} style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#111827",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",transition:"opacity 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}
          >로그인</button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({page,setPage}){
  const mainPage=["search","chatbot","mypage","community"].find(p=>page.startsWith(p))||"search";
  return(
    <nav style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"1px solid #e5e7eb",display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)"}}>
      {NAV_ITEMS.map(n=>(
        <button key={n.page} onClick={()=>setPage(n.page)} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:mainPage===n.page?"#111827":"#9ca3af",transition:"color 0.15s"}}>
          <span style={{fontSize:19,lineHeight:1}}>{n.icon}</span>
          <span style={{fontSize:10,fontWeight:mainPage===n.page?700:500}}>{n.label}</span>
          {mainPage===n.page&&<div style={{width:18,height:2.5,background:"#111827",borderRadius:2,marginTop:1}}/>}
        </button>
      ))}
    </nav>
  );
}

// ─── 루트 ─────────────────────────────────────────────────────────────────

const GLOBAL_CSS=`
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
  *,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{margin:0;padding:0;height:100%;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  input[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes floatOrb{0%,100%{transform:translate(0,0)}50%{transform:translate(10px,-14px)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
`;

export default function App(){
  const [page,setPage]=useState("search");
  const [detailPolicy,setDetailPolicy]=useState(null);
  const [fromPage,setFromPage]=useState("search");
  const [favIds,setFavIds]=useLocalStorage("yoa:favs",new Set());
  const bp=useBreakpoint();

  const toggleFav=useCallback(id=>{
    setFavIds(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
  },[setFavIds]);

  const goDetail=useCallback(policy=>{
    setFromPage(page);
    setDetailPolicy(policy);
    setPage("detail");
  },[page]);

  const goBack=useCallback(()=>{
    setDetailPolicy(null);
    setPage(fromPage);
  },[fromPage]);

  const goDetailFromDetail=useCallback(policy=>{
    setDetailPolicy(policy);
    window.scrollTo({top:0,behavior:"smooth"});
  },[]);

  const isDetail=page==="detail"&&detailPolicy;

  const [policies,setPolicies]=useState(POLICIES);
  useEffect(()=>{
    loadPolicies()
      .then(data=>{
        const arr=Array.isArray(data)?data:[];
        const mapped=arr.reduce((acc,raw,idx)=>{
          try{acc.push(mapRawPolicy(raw,idx));}catch(e){}
          return acc;
        },[]);
        if(mapped.length>0)setPolicies(mapped);
      })
      .catch(()=>{});
  },[]);

  const viewProps={favIds,onToggleFav:toggleFav,onGoDetail:goDetail,bp,setPage,policies};

  // 페이지 전환 시 상세 닫기
  const navigateTo=useCallback(p=>{
    setDetailPolicy(null);
    setPage(p);
  },[]);

  const [adminMode,setAdminMode]=useState(()=>window.location.hash==="#admin");
  useEffect(()=>{
    const onHash=()=>setAdminMode(window.location.hash==="#admin");
    window.addEventListener("hashchange",onHash);
    return ()=>window.removeEventListener("hashchange",onHash);
  },[]);
  if(adminMode){
    return(
      <>
        <style>{GLOBAL_CSS}</style>
        <AdminPage/>
      </>
    );
  }

  if(page==="login"){
    return(
      <>
        <style>{GLOBAL_CSS}</style>
        <LoginPage setPage={navigateTo} bp={bp}/>
      </>
    );
  }

  if(page==="signup"){
    return(
      <>
        <style>{GLOBAL_CSS}</style>
        <SignupPage setPage={navigateTo} bp={bp}/>
      </>
    );
  }

  if(bp.isDesktop){
    return(
      <div style={{display:"flex",height:"100vh",overflow:"hidden",fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
        <style>{GLOBAL_CSS}</style>
        <Sidebar page={page} setPage={navigateTo} favIds={favIds}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {!isDetail&&(
            <div style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:"0 32px",flexShrink:0}}>
              <div style={{height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>
                  {page==="search"&&"🔍 검색"}
                  {page==="chatbot"&&"🤖 AI 챗봇"}
                  {page==="mypage"&&"👤 마이페이지"}
                  {page==="community"&&"💬 커뮤니티"}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{fontSize:13,color:favIds.size>0?"#b45309":"#9ca3af",background:favIds.size>0?"#fffbeb":"#f8fafc",border:favIds.size>0?"1px solid #fde68a":"1px solid #e5e7eb",borderRadius:20,padding:"6px 14px"}}>⭐ 저장 {favIds.size}건</div>
                  <button onClick={()=>navigateTo("signup")} style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"white",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#111827";e.currentTarget.style.color="#111827";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#374151";}}
                  >회원가입</button>
                  <button onClick={()=>navigateTo("login")} style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#111827",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",transition:"opacity 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                  >로그인</button>
                </div>
              </div>
            </div>
          )}
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {isDetail
              ?<div style={{flex:1,overflowY:"auto"}}><PolicyDetailView policy={detailPolicy} favIds={favIds} onToggle={toggleFav} onBack={goBack} onGoDetail={goDetailFromDetail} bp={bp} policies={policies}/></div>
              :page==="search"    ?<div style={{flex:1,overflow:"hidden"}}><SearchView {...viewProps}/></div>
              :page==="chatbot"   ?<div style={{flex:1,overflow:"hidden"}}><ChatBotView bp={bp}/></div>
              :page==="mypage"    ?<div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><MyPageView {...viewProps}/></div>
              :page==="community" ?<div style={{flex:1,overflowY:"auto"}}><CommunityView bp={bp}/></div>
              :null
            }
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>
      {!isDetail&&(
        bp.isTablet
          ?<TopNav page={page} setPage={navigateTo} favIds={favIds}/>
          :(
            <header style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:"0 16px",position:"sticky",top:0,zIndex:50}}>
              <div style={{height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <button onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
                  <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#1e293b,#0f172a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏛️</div>
                  <div style={{fontWeight:900,fontSize:15,color:"#111827"}}>청년ON</div>
                </button>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{fontSize:12,color:favIds.size>0?"#b45309":"#9ca3af",fontWeight:600}}>⭐ {favIds.size}건</div>
                  <button onClick={()=>navigateTo("login")} style={{padding:"5px 12px",borderRadius:7,border:"none",background:"#111827",color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>로그인</button>
                </div>
              </div>
            </header>
          )
      )}


      <main style={{flex:1,overflow:isDetail?"auto":"auto",paddingBottom:isDetail?0:62}}>
        {isDetail
          ?<PolicyDetailView policy={detailPolicy} favIds={favIds} onToggle={toggleFav} onBack={goBack} onGoDetail={goDetailFromDetail} bp={bp} policies={policies}/>
          :page==="search"    ?<SearchView {...viewProps}/>
          :page==="chatbot"   ?<ChatBotView bp={bp}/>
          :page==="mypage"    ?<MyPageView {...viewProps}/>
          :page==="community" ?<CommunityView bp={bp}/>
          :null
        }
      </main>
      {!isDetail&&<BottomNav page={page} setPage={navigateTo}/>}
    </div>
  );
}
