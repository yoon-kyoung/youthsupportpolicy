import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import MyPageContainer from "./components/mypage/MyPageContainer";
import {
  Search, Bot, User, MessageCircle,
  Sparkles, ClipboardList, Calendar,
  Landmark, Star, Link2,
  ChevronLeft, ChevronDown, X,
  Shield, Clock, Briefcase, Home,
  Wallet, BookOpen, HeartPulse, LayoutGrid,
  Flame, Share2, BookMarked,
} from "lucide-react";
import ChatBotView from "./chatbot/ChatBotView";
import AdminPage from "./chatbot/AdminPage";
import AdminShell from "./admin/AdminShell";
import { loadPolicies } from "./chatbot/policiesStore";
import { supabase } from "./supabase";
import Icon from "./styles/Icon";

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

const SUPPORT_REMOVE=[
  '사업기간','총사업비','사업비','사업규모','사업량','사업명','사업목표','사업목적',
  '수행기관','주관기관','운영기관','추진기관','담당기관','담당자','주최','주관','운영주체',
  '운영방식','운영방법','운영방안','운영기간','운영계획',
  '역할','주요역할','수행역할',
  '추진방법','추진방향','추진일정','추진방안','추진체계','추진절차',
  '참여인원','모집인원','지원인원','선발인원','모집규모','사업별',
  '신청기간','접수기간','접수방법','신청방법',
  '임기','문의처','문의','지원근거','법적근거',
  '구성','위치','장소','기간/장소',
  '대상','지원대상','참여대상','신청대상','신청자격','참여자격',
];
function extractBulletLabel(inner){
  // (label) 형식
  const pm=inner.match(/^\(([^)]{1,12})\)/);
  if(pm)return pm[1].replace(/\s/g,"");
  // label: 형식 — 콜론은 앞 18자 이내에서만 탐색 (이후 텍스트에 섞인 콜론 오탐 방지)
  const colon=inner.slice(0,18).indexOf(":");
  if(colon>-1)return inner.slice(0,colon).replace(/\s/g,"");
  return inner.slice(0,12).replace(/\s/g,"");
}
const KEEP_LABELS=['주요내용','지원내용','주요혜택','주요사업내용'];
function stripSectionLabel(s){
  if(/^\([^)]+\)/.test(s)) return s.replace(/^\([^)]+\)\s*/,"");
  const colon=s.slice(0,18).indexOf(":");
  if(colon>-1) return s.slice(colon+1).trimStart();
  return s;
}
function cleanSupportFull(text){
  if(!text)return"";
  let t=text;
  // ㅇ·❍·◦·□·"- label:" → ○ 로 정규화
  if(t.startsWith("ㅇ "))t="○ "+t.slice(2);
  t=t.replace(/[ \n]ㅇ /g,"\n○ ");
  t=t.replace(/❍/g,"○");
  t=t.replace(/◦/g,"○");
  t=t.replace(/□/g,"○");
  t=t.replace(/ - (?=[가-힣]{1,12}[：:])/g,"\n○ ");
  if(/^- [가-힣]{1,12}[：:]/.test(t))t="○ "+t.slice(2);
  if(!t.includes("○")){
    // 불릿 없는 텍스트: 섹션 라벨만 있는 줄 제거 + 맨앞 "라벨:" 패턴 제거
    t=t.split("\n").filter(line=>!KEEP_LABELS.includes(line.trim())&&!SUPPORT_REMOVE.some(kw=>line.trim()===kw)).join("\n");
    t=t.replace(new RegExp(`^(${KEEP_LABELS.join("|")})\\s*[:：]\\s*`),"");
    return t.trim();
  }
  const parts=t.split(/(?=○)/).filter(s=>s.trim());
  // 주요내용·지원내용 등 명시 섹션이 있으면 해당 섹션만 추출
  const keepParts=parts.filter(part=>{
    const inner=part.replace(/^[○▪□❍◆·\s]+/,"");
    const label=extractBulletLabel(inner);
    return KEEP_LABELS.some(kw=>label.includes(kw));
  });
  const targetParts=keepParts.length>0
    ?keepParts
    :parts.filter(part=>{
        const inner=part.replace(/^[○▪□❍◆·\s]+/,"");
        const label=extractBulletLabel(inner);
        return!SUPPORT_REMOVE.some(kw=>label.includes(kw));
      });
  const result=targetParts.map(part=>{
    let s=part.replace(/^[○▪□❍◆·\s]+/,"");
    // KEEP_LABELS 라벨이 맨 앞에 있으면 직접 제거 (콜론 없는 형식도 처리)
    const matched=KEEP_LABELS.find(kw=>s.startsWith(kw));
    if(matched) s=s.slice(matched.length).replace(/^[\s\-:：]+/,"");
    else s=stripSectionLabel(s);
    return s.trim();
  }).filter(Boolean);
  return result.length>0?result.join("\n"):"";
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
    supportFull:raw.supportSummary||cleanSupportFull((raw.support||"").replace(/<[^>]+>/g,"").trim()),
    amount:extractAmount(raw.support||""),
    deadline,
    views:idx%500+100,
    hot,
    description:raw.summary||"",
    howto:raw.applyMethod||buildHowto(applyUrl,refUrl,raw.org||""),
    docs:raw.submitDocs||"",
    applyUrl,
    refUrl,
    region:(()=>{
      if(raw.regions&&raw.regions.length>0)return raw.regions[0];
      const m=(raw.org||"").match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
      return m?m[1]:"전국";
    })(),
  };
}

// ─── 데이터 ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value:"all",    icon:"apps",     label:"전체" },
  { value:"job",    icon:"work",     label:"취업·창업" },
  { value:"house",  icon:"home",     label:"주거" },
  { value:"money",  icon:"payments", label:"금융·자산" },
  { value:"edu",    icon:"school",   label:"교육·역량" },
  { value:"health", icon:"favorite", label:"건강·심리" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c=>[c.value,c.label]));
const CAT_ICON  = Object.fromEntries(CATEGORIES.map(c=>[c.value,c.icon]));

const MINISTRIES = [
  "전체","고용노동부","중소벤처기업부","교육부","국토교통부","보건복지부",
  "농림축산식품부","과학기술정보통신부","문화체육관광부","국가보훈부",
  "행정안전부","외교부","산업통상자원부","해양수산부","병무청","산림청",
];

const REGIONS = [
  "전체","서울","경기","인천","부산","대구","광주","대전","울산",
  "강원","충북","충남","전북","전남","경북","경남","제주","세종",
];
const CAT_COLORS = {
  job:    { bg:"#E0F2FE", border:"#BAE6FD", text:"#0369A1", dot:"#0369A1", grad:"linear-gradient(135deg,#0C4A6E,#0369A1)" },
  house:  { bg:"#DCFCE7", border:"#BBF7D0", text:"#15803D", dot:"#15803D", grad:"linear-gradient(135deg,#14532D,#15803D)" },
  money:  { bg:"#FEF3C7", border:"#FDE68A", text:"#B45309", dot:"#B45309", grad:"linear-gradient(135deg,#78350F,#B45309)" },
  edu:    { bg:"#EDE9FE", border:"#DDD6FE", text:"#6D28D9", dot:"#6D28D9", grad:"linear-gradient(135deg,#4C1D95,#6D28D9)" },
  health: { bg:"#FCE7F3", border:"#FBCFE8", text:"#BE185D", dot:"#BE185D", grad:"linear-gradient(135deg,#831843,#BE185D)" },
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
  { page:"chatbot",   icon:"chat", label:"AI챗봇" },
  { page:"search",    icon:"search",    label:"검색" },
  { page:"mypage",    icon:"person",    label:"마이페이지", hasSub:true },
  { page:"community", icon:"forum",     label:"커뮤니티" },
];

const MY_SUB_PAGES = [
  { sub:"info",  icon:"calendar_month", label:"내 정보" },
  { sub:"prefs", icon:"tune",           label:"맞춤 조건" },
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
  useEffect(()=>{
    const handler=e=>{
      if(e.detail.key!==key)return;
      setVal(e.detail.value);
    };
    window.addEventListener("yoa:ls",handler);
    return()=>window.removeEventListener("yoa:ls",handler);
  },[key]);
  const set=useCallback(upd=>{
    setVal(prev=>{
      const next=typeof upd==="function"?upd(prev):upd;
      try{
        localStorage.setItem(key,JSON.stringify(next instanceof Set?[...next]:next));
        window.dispatchEvent(new CustomEvent("yoa:ls",{detail:{key,value:next}}));
      }catch{}
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
function dDayStyle(d){
  if(d<=7)  return{color:"#FF4D4D",bg:"#FFF0F0",border:"#FFBDBD"};
  if(d<30)  return{color:"#FF9100",bg:"#FFF4E6",border:"#FFD9A0"};
  return{color:"#00C853",bg:"#E6FAEF",border:"#99F0BC"};
}
function dDayHeroStyle(d){
  if(d<=7)  return{color:"#fca5a5",bg:"rgba(239,68,68,0.25)", border:"rgba(239,68,68,0.4)"};
  if(d<30)  return{color:"#fde68a",bg:"rgba(245,158,11,0.25)",border:"rgba(245,158,11,0.4)"};
  return{color:"#86efac",bg:"rgba(34,197,94,0.25)", border:"rgba(34,197,94,0.4)"};
}

// ─── 공통 컴포넌트 ──────────────────────────────────────────────────────────

const TAG_BASE={fontSize:12,fontWeight:700,lineHeight:1,padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center"};

function CatBadge({cat}){
  const c=CAT_COLORS[cat]||{};
  return(
    <span style={{...TAG_BASE,background:c.bg,border:`1px solid ${c.border}`,color:c.text,gap:4}}>
      <Icon name={CAT_ICON[cat]||"apps"} size={13} color={c.text}/>{CAT_LABEL[cat]||cat}
    </span>
  );
}

function DeadlinePill({deadline}){
  const d=daysLeft(deadline);
  if(d===null)return<span style={{...TAG_BASE,background:"#F1F5F9",border:"1px solid #E2E8F0",color:"#64748B"}}>상시 접수</span>;
  if(d<=0)    return<span style={{...TAG_BASE,background:"#F1F5F9",border:"1px solid #E2E8F0",color:"#94A3B8"}}>마감됨</span>;
  const s=dDayStyle(d);
  return<span style={{...TAG_BASE,background:s.bg,border:`1px solid ${s.border}`,color:s.color}}>D-{d}</span>;
}

function PolicyCard({policy,favIds,onToggle,onGoDetail,compact,delay=0}){
  const [ref,visible]=useReveal();
  const [copied,setCopied]=useState(false);
  const isFav=favIds.has(policy.id);
  const c=CAT_COLORS[policy.cat]||{};
  const handleShare=e=>{
    e.stopPropagation();
    const url=`${window.location.origin}${window.location.pathname}?policy=${policy.id}`;
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };
  return(
    <div ref={ref} onClick={()=>onGoDetail(policy)} style={{
      background:"white",borderRadius:16,border:"1.5px solid #E2E8F0",
      padding:compact?"12px 14px":"18px 20px",
      cursor:"pointer",position:"relative",
      display:"flex",flexDirection:"column",
      transition:"transform 0.2s,box-shadow 0.2s,opacity 0.4s",
      opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(20px)",
      transitionDelay:`${delay}ms`,
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.09)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="";}}
    >
      {policy.hot&&<span style={{position:"absolute",top:10,right:74,fontSize:11,color:"#dc2626",background:"#fef2f2",padding:"2px 7px",borderRadius:20,fontWeight:700,display:"inline-flex",alignItems:"center",gap:3}}><Icon name="local_fire_department" size={11} color="#dc2626"/> 인기</span>}
      <button onClick={handleShare}
        style={{position:"absolute",top:9,right:38,background:"none",border:"none",cursor:"pointer",color:"#d1d5db",padding:4,transition:"color 0.15s,transform 0.12s",display:"flex",alignItems:"center"}}
        onMouseEnter={e=>e.currentTarget.style.color="#6b7280"}
        onMouseLeave={e=>e.currentTarget.style.color="#d1d5db"}
        title="링크 복사"
      ><Icon name="link" size={15} color="inherit"/></button>
      <button onClick={e=>{e.stopPropagation();onToggle(policy.id);}}
        style={{position:"absolute",top:9,right:10,background:"none",border:"none",cursor:"pointer",color:isFav?"#f59e0b":"#d1d5db",padding:4,transition:"color 0.15s,transform 0.12s",display:"flex",alignItems:"center"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.35)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}
      ><Icon name="star" filled={isFav} size={18} color={isFav?"#f59e0b":"#d1d5db"}/></button>
      {copied&&<div style={{position:"absolute",top:38,right:6,background:"#1f2937",color:"white",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap",zIndex:20,boxShadow:"0 2px 8px rgba(0,0,0,0.18)",animation:"fadeUp 0.2s ease"}}>URL 복사 완료</div>}
      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <CatBadge cat={policy.cat}/><DeadlinePill deadline={policy.deadline}/>
      </div>
      <div style={{fontWeight:700,fontSize:compact?13:14,color:"#111827",lineHeight:1.4,marginBottom:4,paddingRight:60}}>{policy.title}</div>
      <div style={{fontSize:12,color:"#9ca3af",marginBottom:compact?0:12}}>{policy.org} · {policy.target}</div>
      {!compact&&<div style={{fontSize:12,color:"#9ca3af",marginTop:"auto",paddingTop:12}}>자세히 보기 →</div>}
    </div>
  );
}

// ─── 정책 상세 페이지 ──────────────────────────────────────────────────────

function PolicyDetailView({policy,favIds,onToggle,onBack,onGoDetail,bp,policies}){
  const isFav=favIds.has(policy.id);
  const [copied,setCopied]=useState(false);
  const c=CAT_COLORS[policy.cat]||{grad:"linear-gradient(135deg,#0C4A6E,#0369A1)",bg:"#E0F2FE",border:"#BAE6FD",text:"#0369A1"};
  const d=daysLeft(policy.deadline);
  const handleShare=()=>{
    const url=`${window.location.origin}${window.location.pathname}?policy=${policy.id}`;
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };
  const similar=policies.filter(p=>p.cat===policy.cat&&p.id!==policy.id).slice(0,3);
  const cols=bp.isDesktop?3:bp.isTablet?2:1;

  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"});},[policy.id]);

  return(
    <div style={{background:"#f8fafc",minHeight:"100%",animation:"fadeUp 0.25s ease"}}>
      {/* 뒤로가기 헤더 */}
      <div style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:bp.isDesktop?"0 40px":"0 16px",position:"sticky",top:0,zIndex:40}}>
        <div style={{height:bp.isDesktop?56:52,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"#374151",fontSize:14,fontWeight:600,padding:"8px 0",transition:"color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#007FFF"}
            onMouseLeave={e=>e.currentTarget.style.color="#374151"}
          ><Icon name="arrow_back" size={16} color="currentColor"/> 뒤로가기</button>
          <span style={{color:"#e5e7eb"}}>|</span>
          <span style={{fontSize:13,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{policy.title}</span>
          <button onClick={()=>onToggle(policy.id)} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,lineHeight:1,background:isFav?"#fffbeb":"#f8fafc",border:isFav?"1px solid #fde68a":"1px solid #e5e7eb",borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:600,color:isFav?"#b45309":"#9ca3af",transition:"all 0.15s"}}>
            <Icon name="star" filled={isFav} size={13} color={isFav?"#b45309":"#9ca3af"}/>{isFav?"저장됨":"저장하기"}
          </button>
        </div>
      </div>

      {/* 히어로 */}
      <div style={{background:c.grad,padding:bp.isDesktop?"52px 40px 44px":bp.isTablet?"36px 24px 30px":"28px 18px 24px",position:"relative",overflow:"hidden",color:"white"}}>
        <div style={{position:"absolute",right:"-5%",top:"-30%",width:bp.isDesktop?360:200,height:bp.isDesktop?360:200,borderRadius:"50%",background:"rgba(255,255,255,0.08)",animation:"floatOrb 8s ease-in-out infinite"}}/>
        <div style={{position:"relative",maxWidth:bp.isDesktop?860:"100%"}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700,lineHeight:1,display:"inline-flex",alignItems:"center",gap:4}}><Icon name={CAT_ICON[policy.cat]||"apps"} size={12} color="white"/>{CAT_LABEL[policy.cat]}</span>
            {d!==null&&d>0&&(()=>{const s=dDayHeroStyle(d);return<span style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700,color:s.color}}>D-{d}</span>;})()}
            {policy.hot&&<span style={{background:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700,lineHeight:1,color:"#fde68a",display:"inline-flex",alignItems:"center",gap:3}}><Icon name="local_fire_department" size={12} color="#fde68a"/> 인기</span>}
          </div>
          <h1 style={{fontSize:bp.isDesktop?38:bp.isTablet?28:22,fontWeight:900,margin:"0 0 12px",lineHeight:1.25,letterSpacing:"-0.02em"}}>{policy.title}</h1>
          <p style={{fontSize:bp.isDesktop?16:14,opacity:0.85,margin:"0 0 4px",lineHeight:1.7,maxWidth:600}}>{policy.org} · {policy.target}</p>
        </div>
        {(policy.supportFull||policy.amount>0)&&<div style={{position:"relative",marginTop:20,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:14,padding:bp.isDesktop?"14px 22px":"10px 16px"}}>
          <div style={{fontSize:11,opacity:0.7,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>주요 혜택</div>
          {policy.supportFull&&<div style={{fontSize:bp.isDesktop?15:13,fontWeight:600,lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{policy.supportFull}</div>}
          {policy.amount>0&&<div style={{fontSize:12,opacity:0.75,marginTop:8}}>최대 {policy.amount.toLocaleString()}만원</div>}
        </div>}
      </div>

      {/* 본문 */}
      <div style={{padding:bp.isDesktop?"40px 40px 60px":bp.isTablet?"28px 24px 60px":"20px 16px 80px"}}>
        <div style={{display:bp.isDesktop?"grid":"block",gridTemplateColumns:"1fr 360px",gap:28,maxWidth:bp.isDesktop?1200:"100%",margin:"0 auto"}}>
          <div>
            {[
              {title:<><Icon name="list_alt" size={16} color="#111827"/> 사업 개요</>,content:<p style={{fontSize:bp.isDesktop?15:14,color:"#374151",lineHeight:1.8,margin:0}}>{policy.description}</p>},
              {title:<><Icon name="edit_note" size={16} color="#111827"/> 신청 방법</>,content:(()=>{
                const howtoText=policy.howto||"";
                const isNumbered=/^\d+[\.\)]\s/.test(howtoText.trim());
                if(isNumbered){
                  return(
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {howtoText.split("\n").filter(s=>s.trim()).map((step,i)=>(
                        <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                          <div style={{width:26,height:26,borderRadius:"50%",background:c.bg,border:`1.5px solid ${c.border}`,color:c.text,fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                          <div style={{fontSize:bp.isDesktop?14:13,color:"#374151",lineHeight:1.7,paddingTop:3}}>{step.replace(/^\d+[\.\)]\s*/,"")}</div>
                        </div>
                      ))}
                    </div>
                  );
                }
                return(
                  <div style={{fontSize:bp.isDesktop?14:13,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{howtoText}</div>
                );
              })()},
              {title:<><Icon name="folder_open" size={16} color="#111827"/> 필요 서류</>,content:(()=>{
                const docsText=policy.docs||"";
                if(!docsText){
                  return(
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <p style={{margin:0,fontSize:bp.isDesktop?14:13,color:"#374151",lineHeight:1.8}}>
                        필요 서류는 정책마다 다르며 공식 공고문에서 확인하실 수 있습니다.
                      </p>
                      {(policy.refUrl||policy.applyUrl)&&(
                        <a href={policy.refUrl||policy.applyUrl} target="_blank" rel="noopener noreferrer"
                          style={{display:"inline-flex",alignItems:"center",gap:6,background:c.bg,border:`1px solid ${c.border}`,color:c.text,borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700,textDecoration:"none",width:"fit-content"}}
                        ><Icon name="description" size={14} color={c.text}/> 공식 공고문 바로가기 →</a>
                      )}
                    </div>
                  );
                }
                const isSimpleList=!docsText.includes("\n")&&!/[○□●·•]/.test(docsText);
                if(isSimpleList){
                  return(
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {docsText.split(",").map(doc=>(
                        <span key={doc} style={{background:c.bg,border:`1px solid ${c.border}`,color:c.text,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600}}>{doc.trim()}</span>
                      ))}
                    </div>
                  );
                }
                return(
                  <div style={{fontSize:bp.isDesktop?14:13,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{docsText}</div>
                );
              })()},
            ].map(({title,content},i)=>(
              <section key={i} style={{background:"white",borderRadius:20,padding:bp.isDesktop?"28px 32px":"20px 18px",marginBottom:16,border:"1.5px solid #f1f5f9"}}>
                <h2 style={{fontSize:bp.isDesktop?17:15,fontWeight:800,color:"#111827",marginTop:0,marginBottom:14}}>{title}</h2>
                {content}
              </section>
            ))}
          </div>
          <div>
            <div style={{background:"white",borderRadius:20,padding:bp.isDesktop?"24px":"20px 18px",marginBottom:16,border:"1.5px solid #f1f5f9",position:bp.isDesktop?"sticky":"static",top:72}}>
              <h2 style={{fontSize:bp.isDesktop?15:14,fontWeight:800,color:"#111827",lineHeight:1,marginTop:0,marginBottom:16,display:"flex",alignItems:"center",gap:6}}><Icon name="push_pin" size={16} color="#111827"/> 핵심 정보</h2>
              {[
                {icon:"group",        label:"신청 대상", val:policy.target},
                {icon:"account_balance",label:"주관 기관",val:policy.org},
                {icon:"calendar_month",label:"신청 기한",val:policy.deadline==="상시"?"상시 접수":`${policy.deadline}${d!==null&&d>0?` (D-${d})`:""}`},
                {icon:"payments",     label:"지원 금액", val:policy.amount>0?`최대 ${policy.amount.toLocaleString()}만원`:"비금전 지원"},
                {icon:"visibility",   label:"관심도",    val:`${policy.views.toLocaleString()}명 확인`},
              ].map(({icon,label,val})=>(
                <div key={label} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #f8fafc"}}>
                  <div style={{fontSize:12,color:"#9ca3af",minWidth:90,flexShrink:0,lineHeight:1,display:"flex",alignItems:"center",gap:4}}><Icon name={icon} size={12} color="#9ca3af"/>{label}</div>
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
                <button onClick={()=>onToggle(policy.id)} style={{padding:"12px",borderRadius:14,border:isFav?"1.5px solid #fde68a":"1.5px solid #e5e7eb",background:isFav?"#fffbeb":"white",color:isFav?"#b45309":"#6b7280",fontSize:14,fontWeight:700,lineHeight:1,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon name="star" filled={isFav} size={15} color={isFav?"#b45309":"#6b7280"}/>{isFav?"저장됨":"저장하기"}</button>
                <div style={{position:"relative"}}>
                  <button onClick={handleShare} style={{width:"100%",padding:"12px",borderRadius:14,border:"1.5px solid #e5e7eb",background:"white",color:"#6b7280",fontSize:14,fontWeight:700,lineHeight:1,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Icon name="link" size={15} color="#6b7280"/> 공유하기</button>
                  {copied&&<div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"white",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,whiteSpace:"nowrap",zIndex:20,boxShadow:"0 2px 8px rgba(0,0,0,0.18)",animation:"fadeUp 0.2s ease"}}>URL이 복사되었습니다</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
        {similar.length>0&&(
          <div style={{maxWidth:bp.isDesktop?1200:"100%",margin:bp.isDesktop?"32px auto 0":"0 auto"}}>
            <h2 style={{fontSize:bp.isDesktop?18:15,fontWeight:800,color:"#111827",marginBottom:14,display:"flex",alignItems:"center",gap:6}}><Icon name={CAT_ICON[policy.cat]||"apps"} size={18} color="#111827"/>비슷한 {CAT_LABEL[policy.cat]} 정책</h2>
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
  const [excludeExpired,setExcludeExpired]=useLocalStorage("yoa:excludeExpired",false);
  const [ministry,setMinistry]=useLocalStorage("yoa:search:ministry","전체");
  const [region,setRegion]=useLocalStorage("yoa:search:region","전체");
  const query=useDebounce(rawQ,300);

  const catCounts=useMemo(()=>{
    const base=excludeExpired
      ?policies.filter(p=>{
          if(p.deadline==="상시")return true;
          return Math.ceil((new Date(p.deadline)-Date.now())/86400000)>0;
        })
      :policies;
    const m={all:base.length};
    CATEGORIES.slice(1).forEach(c=>{m[c.value]=base.filter(p=>p.cat===c.value).length;});
    return m;
  },[policies,excludeExpired]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    let list=policies.filter(p=>{
      if(cat!=="all"&&p.cat!==cat)return false;
      if(q&&!(p.title+p.org+p.target+p.benefit).toLowerCase().includes(q))return false;
      if(excludeExpired&&p.deadline!=="상시"){
        const d=Math.ceil((new Date(p.deadline)-Date.now())/86400000);
        if(d<=0)return false;
      }
      if(ministry!=="전체"&&p.org!==ministry)return false;
      if(region!=="전체"&&p.region!==region)return false;
      return true;
    });
    if(sort==="deadline")list=[...list].sort((a,b)=>{if(a.deadline==="상시")return 1;if(b.deadline==="상시")return -1;return a.deadline.localeCompare(b.deadline);});
    else if(sort==="amount")list=[...list].sort((a,b)=>b.amount-a.amount);
    else if(sort==="popular")list=[...list].sort((a,b)=>b.views-a.views);
    return list;
  },[query,cat,sort,excludeExpired,ministry,region,policies]);

  const cols=bp.isDesktop?3:bp.isTablet?2:1;

  if(bp.isDesktop){
    return(
      <div style={{display:"flex",height:"100%",background:"#f8fafc"}}>
        <div style={{width:220,flexShrink:0,background:"white",borderRight:"1px solid #e5e7eb",padding:"24px 16px",overflowY:"auto"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#475569",marginBottom:14}}>카테고리</div>
          {CATEGORIES.map(c=>(
            <button key={c.value} onClick={()=>setCat(c.value)}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",background:cat===c.value?"#F0F7FF":"transparent",color:cat===c.value?"#007FFF":"#475569",fontSize:13,fontWeight:cat===c.value?700:400,marginBottom:2,transition:"all 0.12s"}}
              onMouseEnter={e=>{if(cat!==c.value)e.currentTarget.style.background="#F8FAFC"}}
              onMouseLeave={e=>{if(cat!==c.value)e.currentTarget.style.background="transparent"}}
            >
              <span style={{display:"flex",alignItems:"center",gap:4,lineHeight:1}}><Icon name={c.icon} size={13} color={cat===c.value?"#007FFF":"#475569"}/>{c.label}</span><span style={{fontSize:11,opacity:0.7}}>{catCounts[c.value]??0}</span>
            </button>
          ))}
          <div style={{marginTop:20,paddingTop:20,borderTop:"1px solid #E2E8F0"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#475569",marginBottom:10}}>정렬</div>
            {SORT_OPTIONS.map(o=>(
              <button key={o.value} onClick={()=>setSort(o.value)}
                style={{display:"block",width:"100%",padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",background:sort===o.value?"#F0F7FF":"transparent",color:sort===o.value?"#007FFF":"#475569",fontSize:13,fontWeight:sort===o.value?700:400,marginBottom:2,textAlign:"left",transition:"all 0.12s"}}
                onMouseEnter={e=>{if(sort!==o.value)e.currentTarget.style.background="#F8FAFC"}}
                onMouseLeave={e=>{if(sort!==o.value)e.currentTarget.style.background="transparent"}}
              >{o.label}</button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{position:"relative",flex:1}}>
                <input type="search" value={rawQ} onChange={e=>setRawQ(e.target.value)} placeholder="검색어 입력 (정책명, 기관명, 혜택 등)"
                  style={{width:"100%",padding:"11px 42px 11px 16px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none",fontFamily:"inherit",background:"white",boxSizing:"border-box",transition:"border-color 0.15s"}}
                  onFocus={e=>e.target.style.borderColor="#007FFF"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                />
                {rawQ&&<button onClick={()=>setRawQ("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"#e5e7eb",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close" size={12} color="#6b7280"/></button>}
              </div>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                <input type="checkbox" checked={excludeExpired} onChange={e=>setExcludeExpired(e.target.checked)} style={{width:16,height:16,accentColor:"#007FFF",cursor:"pointer"}}/>
                <span style={{fontSize:13,color:"#374151",fontWeight:500}}>마감 제외</span>
              </label>
              {query&&<div style={{fontSize:13,color:"#6b7280",whiteSpace:"nowrap"}}>"{query}" 검색 결과</div>}
            </div>
            <div style={{background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:10,marginTop:4}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#374151",lineHeight:1,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><Icon name="location_on" size={13} color="#374151"/>지역</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {REGIONS.map(r=>(
                    <button key={r} onClick={()=>setRegion(r)} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:region===r?"#007FFF":"#E2E8F0",background:region===r?"#007FFF":"#FFFFFF",color:region===r?"#FFFFFF":"#475569",fontSize:12,fontWeight:region===r?700:400,cursor:"pointer",transition:"all 0.12s",whiteSpace:"nowrap"}}>{r}</button>
                  ))}
                </div>
              </div>
              <div style={{borderTop:"1px solid #E2E8F0",paddingTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#374151",lineHeight:1,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><Icon name="account_balance" size={13} color="#374151"/>중앙부처</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {MINISTRIES.map(m=>(
                    <button key={m} onClick={()=>setMinistry(m)} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:ministry===m?"#007FFF":"#E2E8F0",background:ministry===m?"#007FFF":"#FFFFFF",color:ministry===m?"#FFFFFF":"#475569",fontSize:12,fontWeight:ministry===m?700:400,cursor:"pointer",transition:"all 0.12s",whiteSpace:"nowrap"}}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{marginTop:18}}>
          <div style={{fontSize:12,color:"#94A3B8",marginBottom:10,fontWeight:500}}>
            {query?`"${query}" 검색 결과 · `:"전체 "}<span style={{color:"#007FFF",fontWeight:700}}>{filtered.length}건</span>
          </div>
          {filtered.length===0
            ?<div style={{textAlign:"center",padding:"80px 0",color:"#9ca3af"}}><div style={{marginBottom:12}}><Icon name="search" size={48} color="#9ca3af"/></div><div style={{fontSize:16,fontWeight:600,color:"#374151",marginBottom:6}}>검색 결과가 없어요</div><div style={{fontSize:13}}>다른 키워드나 카테고리를 시도해 보세요</div></div>
            :<div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:14}}>{filtered.map((p,i)=><PolicyCard key={p.id} policy={p} favIds={favIds} onToggle={onToggleFav} onGoDetail={onGoDetail} delay={i*40}/>)}</div>
          }
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"white",padding:"16px 8px 12px",borderBottom:"1px solid #e5e7eb"}}>
        <div style={{fontSize:17,fontWeight:800,color:"#111827",marginBottom:10,paddingLeft:6,display:"flex",alignItems:"center",gap:6}}><Icon name="search" size={17} color="#111827"/> 정책 검색</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{position:"relative",flex:1}}>
            <input type="search" value={rawQ} onChange={e=>setRawQ(e.target.value)} placeholder="검색어 입력 (정책명, 기관명, 혜택 등)"
              style={{width:"100%",padding:"12px 42px 12px 16px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none",background:"#f8fafc",fontFamily:"inherit",transition:"border-color 0.15s",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor="#007FFF"}
              onBlur={e=>e.target.style.borderColor="#e2e8f0"}
            />
            {rawQ&&<button onClick={()=>setRawQ("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"#e5e7eb",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close" size={12} color="#6b7280"/></button>}
          </div>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            <input type="checkbox" checked={excludeExpired} onChange={e=>setExcludeExpired(e.target.checked)}
              style={{width:16,height:16,accentColor:"#007FFF",cursor:"pointer"}}
            />
            <span style={{fontSize:13,color:"#374151",fontWeight:500}}>마감 제외</span>
          </label>
        </div>
        <div style={{background:"#FFFFFF",border:"1px solid #E2E8F0",borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8,marginTop:2}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#374151",lineHeight:1,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><Icon name="location_on" size={13} color="#374151"/>지역</div>
            <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
              {REGIONS.map(r=>(
                <button key={r} onClick={()=>setRegion(r)} style={{padding:"3px 9px",borderRadius:20,border:"1.5px solid",borderColor:region===r?"#007FFF":"#E2E8F0",background:region===r?"#007FFF":"#FFFFFF",color:region===r?"#FFFFFF":"#475569",fontSize:11,fontWeight:region===r?700:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{borderTop:"1px solid #E2E8F0",paddingTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"#374151",lineHeight:1,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><Icon name="account_balance" size={13} color="#374151"/>중앙부처</div>
            <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
              {MINISTRIES.map(m=>(
                <button key={m} onClick={()=>setMinistry(m)} style={{padding:"3px 9px",borderRadius:20,border:"1.5px solid",borderColor:ministry===m?"#007FFF":"#E2E8F0",background:ministry===m?"#007FFF":"#FFFFFF",color:ministry===m?"#FFFFFF":"#475569",fontSize:11,fontWeight:ministry===m?700:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{padding:"8px 14px 6px",overflowX:"auto",background:"white",borderBottom:"1px solid #f1f5f9"}}>
        <div style={{display:"flex",gap:7}}>
          {CATEGORIES.map(c=>(
            <button key={c.value} onClick={()=>setCat(c.value)} style={{display:"flex",alignItems:"center",gap:4,lineHeight:1,whiteSpace:"nowrap",padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",borderColor:cat===c.value?"#007FFF":"#e2e8f0",background:cat===c.value?"#F0F7FF":"white",color:cat===c.value?"#007FFF":"#475569",fontSize:12,fontWeight:cat===c.value?700:500,transition:"all 0.12s"}}><Icon name={c.icon} size={12} color={cat===c.value?"#007FFF":"#475569"}/> {c.label} <span style={{opacity:0.65,fontSize:11}}>({catCounts[c.value]??0})</span></button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 4px"}}>
        <div style={{fontSize:12,color:"#94A3B8",fontWeight:500}}>
          {query?`"${query}" 검색 결과 · `:"전체 "}<span style={{color:"#007FFF",fontWeight:700}}>{filtered.length}건</span>
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{fontSize:12,border:"1px solid #e2e8f0",borderRadius:8,padding:"5px 8px",background:"white",color:"#374151",outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
          {SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{padding:"14px 14px 80px",display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:9}}>
        {filtered.length===0
          ?<div style={{gridColumn:`span ${cols}`,textAlign:"center",padding:"48px 0",color:"#9ca3af"}}><div style={{marginBottom:10}}><Icon name="search" size={36} color="#9ca3af"/></div><div style={{fontSize:15,fontWeight:600,color:"#374151",marginBottom:6}}>검색 결과가 없어요</div><div style={{fontSize:13}}>다른 키워드나 카테고리를 시도해 보세요</div></div>
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
  const [ministry,setMinistry]=useLocalStorage("yoa:ministry","전체");
  const [region,setRegion]=useLocalStorage("yoa:region","전체");
  const saved=policies.filter(p=>favIds.has(p.id));
  const recommended=policies.filter(p=>{
    if(interest!=="all"&&p.cat!==interest)return false;
    if(ministry!=="전체"&&p.org!==ministry)return false;
    if(region!=="전체"&&p.region!==region)return false;
    return true;
  }).sort((a,b)=>b.views-a.views).slice(0,6);
  const cols=bp.isDesktop?3:bp.isTablet?2:1;

  return(
    <div style={{background:"#f8fafc",minHeight:"100%",padding:bp.isDesktop?"36px 40px":bp.isTablet?"28px 24px":"18px 14px"}}>
      {/* 프로필 카드 */}
      <div style={{background:"linear-gradient(135deg,#1E3A8A,#2563EB)",borderRadius:20,padding:bp.isDesktop?"28px 32px":"20px 18px",marginBottom:24,color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:"-5%",top:"-20%",width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{position:"relative"}}>
          <div style={{fontSize:13,opacity:0.75,marginBottom:6}}>나의 맞춤 정책 설정</div>
          <div style={{display:"flex",rowGap:18,columnGap:10,flexWrap:"wrap",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,opacity:0.6,marginBottom:4}}>연령대</div>
              <div style={{display:"flex",gap:6}}>
                {["20대","30대","기타"].map(a=>(
                  <button key={a} onClick={()=>setAgeGroup(a)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:ageGroup===a?"white":"rgba(255,255,255,0.3)",background:ageGroup===a?"rgba(255,255,255,0.25)":"transparent",color:"white",fontSize:12,fontWeight:ageGroup===a?700:400,cursor:"pointer",transition:"all 0.15s"}}>{a}</button>
                ))}
              </div>
            </div>
            <div style={{marginLeft:"auto"}}>
              <div style={{fontSize:11,opacity:0.6,marginBottom:4}}>관심 분야</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {CATEGORIES.map(c=>(
                  <button key={c.value} onClick={()=>setInterest(c.value)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:interest===c.value?"white":"rgba(255,255,255,0.3)",background:interest===c.value?"rgba(255,255,255,0.25)":"transparent",color:"white",fontSize:12,fontWeight:interest===c.value?700:400,cursor:"pointer",transition:"all 0.15s"}}><Icon name={c.icon} size={12} color={interest===c.value?"white":"rgba(255,255,255,0.7)"}/> {c.label}</button>
                ))}
              </div>
            </div>
            <div style={{width:"100%"}}>
              <div style={{fontSize:11,opacity:0.6,marginBottom:4}}>중앙부처</div>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
                {MINISTRIES.map(m=>(
                  <button key={m} onClick={()=>setMinistry(m)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:ministry===m?"white":"rgba(255,255,255,0.3)",background:ministry===m?"rgba(255,255,255,0.25)":"transparent",color:"white",fontSize:12,fontWeight:ministry===m?700:400,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0}}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{width:"100%"}}>
              <div style={{fontSize:11,opacity:0.6,marginBottom:4}}>지역별</div>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
                {REGIONS.map(r=>(
                  <button key={r} onClick={()=>setRegion(r)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:region===r?"white":"rgba(255,255,255,0.3)",background:region===r?"rgba(255,255,255,0.25)":"transparent",color:"white",fontSize:12,fontWeight:region===r?700:400,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0}}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 저장한 정책 */}
      <section style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{fontSize:bp.isDesktop?18:15,fontWeight:800,color:"#111827",lineHeight:1,margin:0,display:"flex",alignItems:"center",gap:6}}><Icon name="star" filled={true} size={bp.isDesktop?16:14} color="#f59e0b"/> 저장한 정책 <span style={{fontSize:13,color:"#9ca3af",fontWeight:400}}>({saved.length}건)</span></h2>
        </div>
        {saved.length===0
          ?<div style={{background:"white",borderRadius:16,padding:"32px",textAlign:"center",color:"#9ca3af",border:"1.5px dashed #e5e7eb"}}>
            <div style={{marginBottom:10}}><Icon name="star" filled={false} size={32} color="#d1d5db"/></div>
            <div style={{fontSize:14,fontWeight:600,color:"#374151",marginBottom:4}}>아직 저장한 정책이 없어요</div>
            <div style={{fontSize:13}}>검색에서 관심 정책을 <Icon name="star" filled={false} size={13} color="#9ca3af"/> 눌러 저장해보세요</div>
          </div>
          :<div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:bp.isDesktop?16:9}}>
            {saved.map((p,i)=><PolicyCard key={p.id} policy={p} favIds={favIds} onToggle={onToggleFav} onGoDetail={onGoDetail} delay={i*60}/>)}
          </div>
        }
      </section>

      {/* 맞춤 추천 */}
      <section>
        <h2 style={{fontSize:bp.isDesktop?18:15,fontWeight:800,color:"#111827",lineHeight:1,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><Icon name="auto_awesome" size={bp.isDesktop?16:14} color="#f59e0b"/> 맞춤 추천 정책</h2>
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
        <div style={{marginBottom:14}}><Icon name="task_alt" size={48} color="#d1d5db"/></div>
        <div style={{fontSize:16,fontWeight:600,color:"#374151",marginBottom:6}}>체크리스트를 작성할 정책이 없어요</div>
        <div style={{fontSize:13}}>나의 맞춤 정책에서 관심 정책을 저장하면<br/>신청 체크리스트를 관리할 수 있어요</div>
      </div>
    );
  }

  return(
    <div style={{background:"#f8fafc",minHeight:"100%",padding:bp.isDesktop?"36px 40px":bp.isTablet?"28px 24px":"18px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h2 style={{fontSize:bp.isDesktop?22:17,fontWeight:800,color:"#111827",lineHeight:1,margin:0,display:"flex",alignItems:"center",gap:8}}><Icon name="task_alt" size={bp.isDesktop?20:17} color="#22c55e"/> 신청 체크리스트</h2>
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
                <div style={{width:44,height:44,borderRadius:12,background:c.bg,border:`1.5px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name={CAT_ICON[p.cat]||"apps"} size={22} color={c.text}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#111827",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:5,background:"#f1f5f9",borderRadius:99,overflow:"hidden",maxWidth:160}}>
                      <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#22c55e":c.dot||"#3B82F6",borderRadius:99,transition:"width 0.4s ease"}}/>
                    </div>
                    <span style={{fontSize:11,color:pct===100?"#15803d":"#9ca3af",fontWeight:700,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:3}}>{done}/{total} {pct===100&&<Icon name="celebration" size={12} color="#15803d"/>}</span>
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
                            {checked&&<Icon name="check" size={14} color="white"/>}
                          </div>
                          <span style={{fontSize:14,color:checked?"#15803d":"#374151",fontWeight:checked?600:400,textDecoration:checked?"line-through":"none",transition:"all 0.15s"}}>{step}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button onClick={()=>onGoDetail(p)} style={{marginTop:12,width:"100%",padding:"10px",borderRadius:10,border:"1px solid #e5e7eb",background:"white",color:"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#007FFF";e.currentTarget.style.color="#007FFF";}}
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
                    background:isSelected?"#007FFF":isToday?"#EFF6FF":"transparent",
                    color:isSelected?"white":isToday?"#007FFF":dow===0?"#ef4444":dow===6?"#3B82F6":"#374151",
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
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:28,flexShrink:0}}><Icon name={CAT_ICON[p.cat]||"apps"} size={22} color={CAT_COLORS[p.cat]?.dot||"#6b7280"}/></div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13,color:"#111827"}}>{p.title}</div>
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{p.org} · {p.benefit}</div>
                      </div>
                      {(()=>{const dd=daysLeft(p.deadline);const s=dDayStyle(dd);return<span style={{fontSize:12,color:s.color,fontWeight:700,background:s.bg,border:`1px solid ${s.border}`,padding:"3px 8px",borderRadius:20,whiteSpace:"nowrap"}}>D-{dd}</span>;})()}
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
            <div style={{fontWeight:800,fontSize:15,color:"#111827",lineHeight:1,marginBottom:16,display:"flex",alignItems:"center",gap:6}}><Icon name="alarm" size={15} color="#ef4444"/> 다가오는 마감</div>
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
                      <div style={{width:34,height:34,borderRadius:10,background:CAT_COLORS[p.cat]?.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name={CAT_ICON[p.cat]||"apps"} size={16} color={CAT_COLORS[p.cat]?.text||"#6b7280"}/></div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{p.deadline}</div>
                      </div>
                      {(()=>{const s=dDayStyle(d2);return<span style={{fontSize:11,fontWeight:700,color:s.color,background:s.bg,border:`1px solid ${s.border}`,padding:"2px 7px",borderRadius:99,flexShrink:0}}>D-{d2}</span>;})()}
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
              color:sub===s.sub?"#007FFF":"#6b7280",
              borderBottom:`2.5px solid ${sub===s.sub?"#007FFF":"transparent"}`,
              transition:"all 0.15s",
              display:"flex",alignItems:"center",gap:4,lineHeight:1,
            }}><Icon name={s.icon} size={14} color={sub===s.sub?"#007FFF":"#6b7280"}/>{s.label}</button>
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

const CAT_COLOR_MAP={후기:{bg:"#F0FDF4",border:"#BBF7D0",text:"#15803D"},정보:{bg:"#EFF6FF",border:"#BFDBFE",text:"#007FFF"},"Q&A":{bg:"#FFF1F2",border:"#FECDD3",text:"#BE123C"}};

function CommunityWriteView({bp,user,onSubmit,onCancel}){
  const [cat,setCat]=useState("후기");
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  const [author,setAuthor]=useState(user?.user_metadata?.name||"");
  const [errors,setErrors]=useState({});
  const [submitting,setSubmitting]=useState(false);
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

  const handleSubmit=async e=>{
    e.preventDefault();
    if(!validate())return;
    setSubmitting(true);
    await onSubmit({
      user_id:user?.id||null,
      cat,
      title:title.trim(),
      author:author.trim(),
      content:content.trim(),
      likes:0,
      comments_count:0,
    });
    setSubmitting(false);
  };

  const inp={width:"100%",padding:"12px 14px",borderRadius:10,fontSize:14,outline:"none",transition:"border-color 0.15s",boxSizing:"border-box",fontFamily:"inherit"};

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:bp.isDesktop?"36px 40px 28px":bp.isTablet?"28px 24px 20px":"22px 16px 16px",color:"white",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onCancel} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:10,color:"white",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18,flexShrink:0,transition:"background 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.22)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
        ><Icon name="arrow_back" size={18} color="currentColor"/></button>
        <div>
          <div style={{fontSize:12,opacity:0.6,marginBottom:4}}>청년 정책 커뮤니티</div>
          <h1 style={{fontSize:bp.isDesktop?24:bp.isTablet?20:17,fontWeight:900,margin:0,letterSpacing:"-0.02em",display:"flex",alignItems:"center",gap:8}}>새 글 작성 <Icon name="edit" size={bp.isDesktop?22:18} color="rgba(255,255,255,0.75)"/></h1>
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
            <button type="submit" disabled={submitting} style={{padding:"11px 28px",borderRadius:10,border:"none",background:"#111827",color:"white",fontSize:14,fontWeight:700,cursor:submitting?"default":"pointer",transition:"opacity 0.15s",opacity:submitting?0.7:1}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}
            >{submitting?"게시 중...":"게시하기"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 커뮤니티 상세 뷰 ─────────────────────────────────────────────────────

function maskName(name){
  const n=(name||"").trim();
  if(n.length<=1)return n;
  if(n.length===2)return n[0]+"O";
  return n[0]+"O".repeat(n.length-2)+n[n.length-1];
}

function CommunityPostDetailView({post,bp,user,onBack,onLike}){
  const [comments,setComments]=useState([]);
  const [liked,setLiked]=useLocalStorage(`yoa:liked_${post.id}`,false);
  const [commentText,setCommentText]=useState("");
  const [commentAuthor,setCommentAuthor]=useState(user?.user_metadata?.name||"");
  const [commentError,setCommentError]=useState("");
  const [submittingComment,setSubmittingComment]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [editText,setEditText]=useState("");
  const cc=CAT_COLOR_MAP[post.cat]||{bg:"#f8fafc",border:"#e5e7eb",text:"#6b7280"};
  const totalComments=comments.length;
  const body=(post.content||post.preview||"").replace(/\\n/g,"\n");
  const fmtDate=iso=>iso?(iso.slice(0,10)):"";

  useEffect(()=>{
    supabase.from("comments").select("*").eq("post_id",post.id).order("created_at",{ascending:true})
      .then(({data})=>setComments(data||[]));
  },[post.id]);

  const handleLike=()=>{
    const next=!liked;
    setLiked(next);
    onLike(post.id,(post.likes||0)+(next?0:-1),next);
  };

  const handleComment=async e=>{
    e.preventDefault();
    if(!user){setCommentError("로그인 후 댓글을 작성할 수 있어요.");return;}
    if(!commentAuthor.trim()){setCommentError("닉네임을 입력해주세요.");return;}
    if(!commentText.trim()){setCommentError("댓글 내용을 입력해주세요.");return;}
    setSubmittingComment(true);
    const{data,error}=await supabase.from("comments").insert({
      post_id:post.id,
      user_id:user.id,
      author:maskName(commentAuthor.trim()),
      content:commentText.trim(),
    }).select().single();
    setSubmittingComment(false);
    if(error){setCommentError("댓글 작성에 실패했어요.");return;}
    setCommentError("");
    setComments(prev=>[...prev,data]);
    setCommentText("");
    await supabase.from("posts").update({comments_count:(post.comments_count||0)+1}).eq("id",post.id);
  };

  const handleEditSave=async id=>{
    if(!editText.trim())return;
    const{error}=await supabase.from("comments").update({content:editText.trim()}).eq("id",id);
    if(!error){
      setComments(prev=>prev.map(c=>c.id===id?{...c,content:editText.trim()}:c));
      setEditingId(null);
    }
  };

  const handleDelete=async id=>{
    if(!window.confirm("댓글을 삭제할까요?"))return;
    const{error}=await supabase.from("comments").delete().eq("id",id);
    if(!error){
      setComments(prev=>prev.filter(c=>c.id!==id));
      await supabase.from("posts").update({comments_count:Math.max(0,(post.comments_count||1)-1)}).eq("id",post.id);
    }
  };

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:bp.isDesktop?"36px 40px 32px":bp.isTablet?"28px 24px 24px":"22px 16px 20px",color:"white"}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.12)",border:"none",borderRadius:10,color:"white",padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:20,transition:"background 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.22)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
        ><Icon name="arrow_back" size={16} color="currentColor"/> 목록으로</button>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:cc.bg,color:cc.text,border:`1px solid ${cc.border}`}}>{post.cat}</span>
          <span style={{fontSize:12,opacity:0.55}}>{fmtDate(post.created_at||post.date)}</span>
        </div>
        <h1 style={{fontSize:bp.isDesktop?26:bp.isTablet?22:18,fontWeight:900,margin:"0 0 16px",lineHeight:1.35,letterSpacing:"-0.02em"}}>{post.title}</h1>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{post.author?.[0]||"?"}</div>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>{post.author}</div>
            <div style={{fontSize:11,opacity:0.5}}>작성자</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:14}}>
            <span style={{fontSize:13,opacity:0.7,lineHeight:1,display:"flex",alignItems:"center",gap:4}}><Icon name="favorite" size={15} color="white"/> {(post.likes||0)+(liked?1:0)}</span>
            <span style={{fontSize:13,opacity:0.7,lineHeight:1,display:"flex",alignItems:"center",gap:4}}><Icon name="chat_bubble" size={15} color="white"/> {totalComments}</span>
          </div>
        </div>
      </div>
      <div style={{padding:bp.isDesktop?"32px 40px":bp.isTablet?"24px 24px":"18px 14px",maxWidth:bp.isDesktop?760:"100%"}}>
        <div style={{background:"white",borderRadius:16,padding:bp.isDesktop?"28px 32px":bp.isTablet?"22px 24px":"18px 18px",border:"1.5px solid #f1f5f9",fontSize:bp.isDesktop?15:14,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
          {body}
        </div>
        <div style={{display:"flex",justifyContent:"center",margin:"24px 0"}}>
          <button onClick={handleLike} style={{display:"flex",alignItems:"center",gap:8,lineHeight:1,padding:"11px 28px",borderRadius:30,fontSize:14,fontWeight:700,cursor:"pointer",border:`2px solid ${liked?"#fca5a5":"#e5e7eb"}`,background:liked?"#fff1f2":"white",color:liked?"#dc2626":"#6b7280",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#fca5a5";e.currentTarget.style.color="#dc2626";e.currentTarget.style.background="#fff1f2";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=liked?"#fca5a5":"#e5e7eb";e.currentTarget.style.color=liked?"#dc2626":"#6b7280";e.currentTarget.style.background=liked?"#fff1f2":"white";}}
          ><Icon name={liked?"favorite":"favorite_border"} size={18} color={liked?"#dc2626":"#6b7280"}/>{liked?"공감 취소":"공감해요"} {post.likes||0}</button>
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
              <button type="submit" disabled={submittingComment} style={{padding:"9px 16px",borderRadius:8,border:"none",background:"#111827",color:"white",fontSize:13,fontWeight:700,cursor:submittingComment?"default":"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"opacity 0.15s",alignSelf:"stretch",opacity:submittingComment?0.7:1}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >{submittingComment?"등록 중":"등록"}</button>
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
                  <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{fmtDate(c.created_at)}</span>
                  {user&&c.user_id===user.id&&editingId!==c.id&&(
                    <div style={{display:"flex",gap:4,marginLeft:8}}>
                      <button onClick={()=>{setEditingId(c.id);setEditText(c.content);}}
                        style={{padding:"3px 9px",borderRadius:6,border:"1px solid #e5e7eb",background:"white",fontSize:11,color:"#6b7280",cursor:"pointer",transition:"all 0.12s",fontFamily:"inherit"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="#374151";e.currentTarget.style.color="#111827";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#6b7280";}}
                      >수정</button>
                      <button onClick={()=>handleDelete(c.id)}
                        style={{padding:"3px 9px",borderRadius:6,border:"1px solid #fecdd3",background:"white",fontSize:11,color:"#ef4444",cursor:"pointer",transition:"all 0.12s",fontFamily:"inherit"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#fff5f5"}
                        onMouseLeave={e=>e.currentTarget.style.background="white"}
                      >삭제</button>
                    </div>
                  )}
                </div>
                {editingId===c.id?(
                  <div style={{paddingLeft:34}}>
                    <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={2} maxLength={500} autoFocus
                      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #6b7280",fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.6,boxSizing:"border-box"}}
                      onFocus={e=>e.target.style.borderColor="#111827"} onBlur={e=>e.target.style.borderColor="#6b7280"}
                    />
                    <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"flex-end"}}>
                      <button onClick={()=>setEditingId(null)}
                        style={{padding:"5px 13px",borderRadius:7,border:"1px solid #e5e7eb",background:"white",fontSize:12,color:"#6b7280",cursor:"pointer",fontFamily:"inherit",transition:"all 0.12s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#374151"} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e7eb"}
                      >취소</button>
                      <button onClick={()=>handleEditSave(c.id)}
                        style={{padding:"5px 13px",borderRadius:7,border:"none",background:"#111827",fontSize:12,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"opacity 0.12s"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                      >저장</button>
                    </div>
                  </div>
                ):(
                  <div style={{fontSize:13,color:"#374151",lineHeight:1.65,paddingLeft:34}}>{c.content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 커뮤니티 뷰 ──────────────────────────────────────────────────────────

function CommunityView({bp,user}){
  const [catFilter,setCatFilter]=useState("전체");
  const [showWrite,setShowWrite]=useState(false);
  const [selectedPost,setSelectedPost]=useState(null);
  const [posts,setPosts]=useState([]);
  const [loadingPosts,setLoadingPosts]=useState(true);
  const cats=["전체","후기","정보","Q&A"];
  const filtered=posts.filter(p=>catFilter==="전체"||p.cat===catFilter);

  const fetchPosts=useCallback(async()=>{
    setLoadingPosts(true);
    const{data}=await supabase.from("posts").select("*").order("created_at",{ascending:false});
    setPosts(data||[]);
    setLoadingPosts(false);
  },[]);

  useEffect(()=>{
    fetchPosts();
  },[fetchPosts]);

  const handleAddPost=useCallback(async newPost=>{
    await supabase.from("posts").insert(newPost);
    await fetchPosts();
    setShowWrite(false);
  },[fetchPosts]);

  const handleLike=useCallback(async(id,currentLikes,add)=>{
    const next=currentLikes+(add?1:-1);
    await supabase.from("posts").update({likes:Math.max(0,next)}).eq("id",id);
    setPosts(prev=>prev.map(p=>p.id===id?{...p,likes:Math.max(0,next)}:p));
    if(selectedPost?.id===id)setSelectedPost(prev=>({...prev,likes:Math.max(0,next)}));
  },[selectedPost]);

  if(showWrite)return <CommunityWriteView bp={bp} user={user} onSubmit={handleAddPost} onCancel={()=>setShowWrite(false)}/>;
  if(selectedPost){
    const livePost=posts.find(p=>p.id===selectedPost.id)||selectedPost;
    return <CommunityPostDetailView post={livePost} bp={bp} user={user} onBack={()=>setSelectedPost(null)} onLike={handleLike}/>;
  }

  return(
    <div style={{background:"#f8fafc",minHeight:"100%"}}>
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:bp.isDesktop?"36px 40px 28px":bp.isTablet?"28px 24px 20px":"22px 16px 16px",color:"white"}}>
        <div style={{fontSize:12,opacity:0.6,marginBottom:8}}>청년 정책 커뮤니티</div>
        <h1 style={{fontSize:bp.isDesktop?32:bp.isTablet?24:20,fontWeight:900,margin:"0 0 8px",letterSpacing:"-0.02em",display:"flex",alignItems:"center",gap:10}}>함께 나누는 정책 이야기 <Icon name="forum" size={bp.isDesktop?28:bp.isTablet?22:18} color="rgba(255,255,255,0.75)"/></h1>
        <p style={{fontSize:bp.isDesktop?15:13,opacity:0.7,margin:0}}>실제 신청 후기, 꿀팁, 궁금한 점을 자유롭게 나눠보세요</p>
      </div>
      <div style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:bp.isDesktop?"0 40px":"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:0,overflowX:"auto"}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)} style={{padding:bp.isDesktop?"13px 18px":"11px 14px",border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:bp.isDesktop?14:13,fontWeight:catFilter===c?700:500,color:catFilter===c?"#111827":"#9ca3af",borderBottom:`2.5px solid ${catFilter===c?"#111827":"transparent"}`,transition:"all 0.15s"}}>{c}</button>
          ))}
        </div>
        <button onClick={()=>user?setShowWrite(true):alert("로그인 후 글을 작성할 수 있어요.")} style={{padding:"7px 16px",borderRadius:20,background:"#111827",border:"none",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"opacity 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}
        >+ 글쓰기</button>
      </div>
      <div style={{padding:bp.isDesktop?"28px 40px 60px":bp.isTablet?"20px 24px 60px":"14px 14px 80px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:bp.isDesktop?800:"100%"}}>
          {loadingPosts&&(
            <div style={{textAlign:"center",padding:"60px 20px",color:"#9ca3af",fontSize:14}}>불러오는 중...</div>
          )}
          {!loadingPosts&&filtered.length===0&&(
            <div style={{textAlign:"center",padding:"60px 20px",color:"#9ca3af"}}>
              <div style={{marginBottom:12,display:"flex",justifyContent:"center"}}><Icon name="edit_note" size={44} color="#d1d5db"/></div>
              <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>아직 게시글이 없어요</div>
              <div style={{fontSize:13}}>첫 번째 글을 작성해보세요!</div>
            </div>
          )}
          {filtered.map((post,i)=>{
            const catColor=CAT_COLOR_MAP[post.cat]||{bg:"#f8fafc",border:"#e5e7eb",text:"#6b7280"};
            return(
              <div key={post.id} onClick={()=>setSelectedPost(post)} style={{background:"white",borderRadius:16,padding:bp.isDesktop?"20px 24px":"14px 16px",cursor:"pointer",border:"1.5px solid #E2E8F0",transition:"transform 0.15s,box-shadow 0.15s",animation:`fadeUp 0.25s ease ${i*50}ms both`}}
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
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{(post.preview||"").replace(/\\n/g," ")}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14,marginTop:12,paddingTop:12,borderTop:"1px solid #E2E8F0"}}>
                  <span style={{fontSize:12,color:"#9ca3af"}}>by <span style={{color:"#374151",fontWeight:600}}>{post.author}</span></span>
                  <div style={{marginLeft:"auto",display:"flex",gap:12}}>
                    <span style={{fontSize:12,color:"#9ca3af",display:"flex",alignItems:"center",gap:3}}><Icon name="favorite" size={13} color="#9ca3af"/> {post.likes}</span>
                    <span style={{fontSize:12,color:"#9ca3af",display:"flex",alignItems:"center",gap:3}}><Icon name="chat_bubble" size={13} color="#9ca3af"/> {post.comments||0}</span>
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
  const [loading,setLoading]=useState(false);

  const handleKakao=async()=>{
    const {error:err}=await supabase.auth.signInWithOAuth({
      provider:"kakao",
      options:{redirectTo:"https://yoon-kyoung.github.io/youthsupportpolicy/"}
    });
    if(err) setError("카카오 로그인 중 오류가 발생했습니다.");
  };

  const handleSubmit=async e=>{
    e.preventDefault();
    if(!email){setError("이메일을 입력해주세요.");return;}
    if(!pw){setError("비밀번호를 입력해주세요.");return;}
    setLoading(true);
    const {error:err}=await supabase.auth.signInWithPassword({email,password:pw});
    setLoading(false);
    if(err){setError("이메일 또는 비밀번호가 올바르지 않습니다.");return;}
    setPage("search");
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      {/* 왼쪽 브랜드 패널 (데스크탑만) */}
      {bp.isDesktop&&(
        <div style={{width:480,background:"linear-gradient(160deg,#0f172a 0%,#0052A3 60%,#007FFF 100%)",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 56px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:"-15%",top:"-10%",width:400,height:400,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
          <div style={{position:"absolute",left:"-10%",bottom:"-10%",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:48}}>
              <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:44,height:44,borderRadius:12}}/>
              <div style={{fontWeight:900,fontSize:22,color:"white",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
            <h2 style={{fontSize:36,fontWeight:900,color:"white",margin:"0 0 16px",lineHeight:1.25,letterSpacing:"-0.02em"}}>한 눈에 보는<br/>청년 정책</h2>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.65)",lineHeight:1.8,margin:"0 0 40px"}}>취업·주거·금융·교육·건강까지<br/>나에게 딱 맞는 청년 정책을 찾아보세요.</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[{icon:"auto_awesome",text:"AI가 찾아주고 내가 고르는 청년 정책 DB"},{icon:"calendar_month",text:"마감일 캘린더 & 체크리스트로 꼼꼼한 신청 관리"},{icon:"forum",text:"생생한 후기가 쏟아지는 청년 정책 커뮤니티"}].map(({icon,text})=>(
                <div key={text} style={{display:"flex",alignItems:"center",gap:10,color:"rgba(255,255,255,0.8)",fontSize:14}}>
                  <Icon name={icon} size={18} color="rgba(255,255,255,0.8)"/>{text}
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
              <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:36,height:36,borderRadius:10}}/>
              <div style={{fontWeight:900,fontSize:20,color:"#111827",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
          )}

          <div style={{background:"white",borderRadius:20,padding:bp.isMobile?"28px 24px":"36px 40px",boxShadow:"0 4px 40px rgba(0,0,0,0.08)",border:"1.5px solid #f1f5f9"}}>
            <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:"0 0 6px",letterSpacing:"-0.02em"}}>로그인</h1>
            <p style={{fontSize:13,color:"#9ca3af",margin:"0 0 28px"}}>계정이 없으신가요? <button onClick={()=>setPage("signup")} style={{background:"none",border:"none",color:"#007FFF",fontSize:13,fontWeight:700,cursor:"pointer",padding:0}}>회원가입</button></p>

            <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:13,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>이메일</label>
                <input
                  type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                  placeholder="example@email.com"
                  style={{width:"100%",padding:"12px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.15s",background:"#f8fafc"}}
                  onFocus={e=>e.target.style.borderColor="#007FFF"}
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
                    onFocus={e=>e.target.style.borderColor="#007FFF"}
                    onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                  />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",padding:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Icon name={showPw?"visibility_off":"visibility"} size={18} color="#9ca3af"/>
                  </button>
                </div>
              </div>

              {error&&<div style={{fontSize:13,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}>{error}</div>}

              <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"#007FFF",color:"white",fontSize:15,fontWeight:800,cursor:loading?"default":"pointer",marginTop:4,transition:"opacity 0.15s",boxShadow:"0 4px 20px rgba(0,127,255,0.25)",opacity:loading?0.7:1}}>
                {loading?"로그인 중...":"로그인"}
              </button>
            </form>

            <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>또는</span>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={handleKakao} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"#FEE500",color:"#191919",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"opacity 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >카카오로 계속하기</button>
            </div>
          </div>

          <button onClick={()=>setPage("search")} style={{display:"flex",alignItems:"center",gap:4,margin:"20px auto 0",background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer",padding:"8px 16px"}}>
            <Icon name="arrow_back" size={14} color="currentColor"/> 메인으로 돌아가기
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

  const [loading,setLoading]=useState(false);

  const handleKakao=async()=>{
    const {error:err}=await supabase.auth.signInWithOAuth({
      provider:"kakao",
      options:{redirectTo:"https://yoon-kyoung.github.io/youthsupportpolicy/"}
    });
    if(err) setErrors({form:"카카오 로그인 중 오류가 발생했습니다."});
  };

  const handleSubmit=async e=>{
    e.preventDefault();
    const e2=validate();
    if(Object.keys(e2).length){setErrors(e2);return;}
    setLoading(true);
    const {data,error:err}=await supabase.auth.signUp({
      email:form.email,
      password:form.pw,
      options:{data:{name:form.name.trim()}},
    });
    setLoading(false);
    if(err){setErrors({msg:err.message});return;}
    setErrors({msg:"가입이 완료됐어요! 로그인해주세요."});
    setTimeout(()=>setPage("login"),1500);
  };

  const inputStyle={width:"100%",padding:"12px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.15s",background:"#f8fafc"};
  const labelStyle={fontSize:13,fontWeight:600,color:"#374151",display:"block",marginBottom:6};
  const errStyle={fontSize:12,color:"#dc2626",marginTop:4};

  return(
    <div style={{minHeight:"100vh",display:"flex",fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      {bp.isDesktop&&(
        <div style={{width:480,background:"linear-gradient(160deg,#0f172a 0%,#0052A3 60%,#007FFF 100%)",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 56px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:"-15%",top:"-10%",width:400,height:400,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
          <div style={{position:"absolute",left:"-10%",bottom:"-10%",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:48}}>
              <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:44,height:44,borderRadius:12}}/>
              <div style={{fontWeight:900,fontSize:22,color:"white",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
            <h2 style={{fontSize:36,fontWeight:900,color:"white",margin:"0 0 16px",lineHeight:1.25,letterSpacing:"-0.02em"}}>한 눈에 보는<br/>청년 정책</h2>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.65)",lineHeight:1.8,margin:"0 0 40px"}}>취업·주거·금융·교육·건강까지<br/>나에게 딱 맞는 청년 정책을 찾아보세요.</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[{icon:"auto_awesome",text:"AI가 찾아주고 내가 고르는 청년 정책 DB"},{icon:"calendar_month",text:"마감일 캘린더 & 체크리스트로 꼼꼼한 신청 관리"},{icon:"forum",text:"생생한 후기가 쏟아지는 청년 정책 커뮤니티"}].map(({icon,text})=>(
                <div key={text} style={{display:"flex",alignItems:"center",gap:10,color:"rgba(255,255,255,0.8)",fontSize:14}}>
                  <Icon name={icon} size={18} color="rgba(255,255,255,0.8)"/>{text}
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
              <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:36,height:36,borderRadius:10}}/>
              <div style={{fontWeight:900,fontSize:20,color:"#111827",letterSpacing:"-0.03em"}}>청년ON</div>
            </div>
          )}

          <div style={{background:"white",borderRadius:20,padding:bp.isMobile?"28px 24px":"36px 40px",boxShadow:"0 4px 40px rgba(0,0,0,0.08)",border:"1.5px solid #f1f5f9"}}>
            <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:"0 0 6px",letterSpacing:"-0.02em"}}>회원가입</h1>
            <p style={{fontSize:13,color:"#9ca3af",margin:"0 0 28px"}}>이미 계정이 있으신가요? <button onClick={()=>setPage("login")} style={{background:"none",border:"none",color:"#007FFF",fontSize:13,fontWeight:700,cursor:"pointer",padding:0}}>로그인</button></p>

            <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={labelStyle}>이름</label>
                <input value={form.name} onChange={set("name")} placeholder="홍길동"
                  style={{...inputStyle,borderColor:errors.name?"#fca5a5":"#e2e8f0"}}
                  onFocus={e=>e.target.style.borderColor="#007FFF"}
                  onBlur={e=>e.target.style.borderColor=errors.name?"#fca5a5":"#e2e8f0"}
                />
                {errors.name&&<div style={errStyle}>{errors.name}</div>}
              </div>
              <div>
                <label style={labelStyle}>이메일</label>
                <input type="email" value={form.email} onChange={set("email")} placeholder="example@email.com"
                  style={{...inputStyle,borderColor:errors.email?"#fca5a5":"#e2e8f0"}}
                  onFocus={e=>e.target.style.borderColor="#007FFF"}
                  onBlur={e=>e.target.style.borderColor=errors.email?"#fca5a5":"#e2e8f0"}
                />
                {errors.email&&<div style={errStyle}>{errors.email}</div>}
              </div>
              <div>
                <label style={labelStyle}>비밀번호</label>
                <div style={{position:"relative"}}>
                  <input type={showPw?"text":"password"} value={form.pw} onChange={set("pw")} placeholder="8자 이상 입력해주세요"
                    style={{...inputStyle,paddingRight:44,borderColor:errors.pw?"#fca5a5":"#e2e8f0"}}
                    onFocus={e=>e.target.style.borderColor="#007FFF"}
                    onBlur={e=>e.target.style.borderColor=errors.pw?"#fca5a5":"#e2e8f0"}
                  />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",padding:4,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name={showPw?"visibility_off":"visibility"} size={18} color="#9ca3af"/></button>
                </div>
                {errors.pw&&<div style={errStyle}>{errors.pw}</div>}
              </div>
              <div>
                <label style={labelStyle}>비밀번호 확인</label>
                <input type={showPw?"text":"password"} value={form.pwConfirm} onChange={set("pwConfirm")} placeholder="비밀번호를 다시 입력해주세요"
                  style={{...inputStyle,borderColor:errors.pwConfirm?"#fca5a5":"#e2e8f0"}}
                  onFocus={e=>e.target.style.borderColor="#007FFF"}
                  onBlur={e=>e.target.style.borderColor=errors.pwConfirm?"#fca5a5":"#e2e8f0"}
                />
                {errors.pwConfirm&&<div style={errStyle}>{errors.pwConfirm}</div>}
              </div>

              <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginTop:4}}>
                <div onClick={()=>setAgreed(v=>!v)} style={{width:20,height:20,borderRadius:6,border:`2px solid ${agreed?"#007FFF":"#d1d5db"}`,background:agreed?"#007FFF":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
                  {agreed&&<Icon name="check" size={13} color="white"/>}
                </div>
                <span style={{fontSize:13,color:"#374151",lineHeight:1.6}}>
                  <span style={{color:"#007FFF",fontWeight:600,cursor:"pointer"}}>이용약관</span> 및 <span style={{color:"#007FFF",fontWeight:600,cursor:"pointer"}}>개인정보처리방침</span>에 동의합니다.
                </span>
              </label>
              {errors.agreed&&<div style={{...errStyle,marginTop:-8}}>{errors.agreed}</div>}
              {errors.msg&&<div style={{fontSize:13,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}>{errors.msg}</div>}

              <button type="submit" disabled={loading} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"#007FFF",color:"white",fontSize:15,fontWeight:800,cursor:loading?"default":"pointer",marginTop:4,transition:"opacity 0.15s",boxShadow:"0 4px 20px rgba(0,127,255,0.25)",opacity:loading?0.7:1}}>
                {loading?"처리 중...":"가입하기"}
              </button>
            </form>

            <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>또는</span>
              <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={handleKakao} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"#FEE500",color:"#191919",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"opacity 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >카카오로 계속하기</button>
            </div>
          </div>

          <button onClick={()=>setPage("search")} style={{display:"flex",alignItems:"center",gap:4,margin:"20px auto 0",background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer",padding:"8px 16px"}}>
            <Icon name="arrow_back" size={14} color="currentColor"/> 메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 네비게이션 ────────────────────────────────────────────────────────────

function NavUserDropdown({user,onLogout,onGoMyPage,compact=false,favCount=0}){
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const name=user?.user_metadata?.name||user?.email||"";
  const email=user?.email||"";
  const avatar=name.charAt(0);

  useEffect(()=>{
    if(!open)return;
    const handle=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",handle);
    return()=>document.removeEventListener("mousedown",handle);
  },[open]);

  return(
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:compact?0:7,background:"none",border:"none",cursor:"pointer",padding:compact?"4px":"5px 8px",borderRadius:compact?"50%":9,transition:"background 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
        onMouseLeave={e=>e.currentTarget.style.background="none"}
        title={compact?name:undefined}
      >
        <span style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{avatar}</span>
        {!compact&&<span style={{fontSize:13,color:"#374151",fontWeight:600}}>{name}</span>}
        {!compact&&<span style={{fontSize:9,color:"#9ca3af",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>▼</span>}
      </button>

      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"white",borderRadius:14,border:"1.5px solid #e5e7eb",boxShadow:"0 8px 32px rgba(0,0,0,0.12)",minWidth:210,overflow:"hidden",zIndex:200,animation:"fadeUp 0.15s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 16px 14px"}}>
            <span style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",color:"#fff",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{avatar}</span>
            <div style={{display:"flex",flexDirection:"column",minWidth:0,gap:2}}>
              <span style={{fontSize:14,color:"#111827",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
              <span style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{email}</span>
              <span style={{fontSize:11,color:"#f59e0b",fontWeight:600,marginTop:2,display:"flex",alignItems:"center",gap:3}}><Icon name="star" filled={true} size={11} color="#f59e0b"/> {favCount}개 정책 저장 중</span>
            </div>
          </div>
          <div style={{height:1,background:"#f1f5f9",margin:"0 12px"}}/>
          <button onClick={()=>{setOpen(false);onGoMyPage();}}
            style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#374151",fontWeight:600,textAlign:"left",transition:"background 0.12s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={15} height={15}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            마이페이지
          </button>
          <div style={{height:1,background:"#f1f5f9",margin:"0 12px"}}/>
          <button onClick={()=>{setOpen(false);onLogout();}}
            style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 16px 13px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#ef4444",fontWeight:600,textAlign:"left",transition:"background 0.12s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#fff5f5"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={15} height={15}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar({page,setPage,favIds,user,open,setOpen}){
  const [mySub,setMySub]=useLocalStorage("yoa:mysub","custom");
  const mainPage=page==="detail"?"":page.split("-")[0];

  const NAV=[
    {id:"chatbot", icon:"chat", label:"AI 챗봇"},
    {id:"search",  icon:"search",    label:"검색"},
    ...(user?[{id:"mypage", icon:"person", label:"마이페이지"}]:[]),
    {id:"community",icon:"forum",    label:"커뮤니티"},
  ];

  return(
    <aside style={{
      width:open?240:64, flexShrink:0, height:"100vh", position:"sticky", top:0,
      background:"#FFFFFF", borderRight:"1px solid #E2E8F0",
      display:"flex", flexDirection:"column",
      padding:open?"20px 16px 24px":"20px 8px 24px",
      overflowY:"auto", overflowX:"hidden",
      transition:"width 0.25s cubic-bezier(0.4,0,0.2,1), padding 0.25s ease",
    }}>

      {/* 로고 + 토글 */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32,justifyContent:open?"space-between":"center"}}>
        {open&&(
          <button onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",padding:0,minWidth:0}}>
            <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:34,height:34,borderRadius:10,flexShrink:0}}/>
            <div style={{overflow:"hidden"}}>
              <div style={{fontWeight:900,fontSize:16,color:"#0F172A",letterSpacing:"-0.03em",whiteSpace:"nowrap"}}>청년ON</div>
              <div style={{fontSize:10,color:"#94A3B8",marginTop:1,whiteSpace:"nowrap"}}>청년정책 안내</div>
            </div>
          </button>
        )}
        <button
          onClick={()=>setOpen(o=>!o)}
          title={open?"메뉴 접기":"메뉴 펼치기"}
          style={{
            width:34,height:34,borderRadius:9,border:"none",cursor:"pointer",
            background:"#F1F5F9",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,transition:"background 0.15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="#E2E8F0"}
          onMouseLeave={e=>e.currentTarget.style.background="#F1F5F9"}
        >
          <Icon name={open?"menu_open":"menu"} size={18} color="#475569"/>
        </button>
      </div>

      {/* 네비게이션 */}
      <nav style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
        {NAV.map(n=>{
          const active=mainPage===n.id;
          return(
            <button
              key={n.id}
              title={open?"":n.label}
              onClick={()=>setPage(n.id)}
              style={{
                display:"flex",alignItems:"center",
                gap:open?12:0,
                padding:open?"11px 14px":"11px 0",
                justifyContent:open?"flex-start":"center",
                borderRadius:12,border:"none",cursor:"pointer",
                background:active?"#F0F7FF":"transparent",
                color:active?"#007FFF":"#475569",
                fontSize:14,fontWeight:active?700:400,
                transition:"all 0.15s",textAlign:"left",
                borderLeft:"none",
                width:"100%",
                position:"relative",
              }}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background="#F8FAFC";e.currentTarget.style.color="#475569"}}}
              onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#475569"}}}
            >
              <Icon name={n.icon} size={18} color={active?"#007FFF":"#475569"}/>
              {open&&<span style={{whiteSpace:"nowrap",overflow:"hidden"}}>{n.label}</span>}
            </button>
          );
        })}
      </nav>

      {open&&(
        <>
          {user?.user_metadata?.role==="admin"&&(
            <button onClick={()=>window.location.hash="#admin"} style={{marginTop:10,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:12,border:"1px solid rgba(251,191,36,0.3)",background:"rgba(251,191,36,0.1)",color:"#fbbf24",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%",transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(251,191,36,0.2)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(251,191,36,0.1)"}
            ><Icon name="admin_panel_settings" size={16} color="#fbbf24"/> 관리자 대시보드</button>
          )}
          <div style={{marginTop:14,fontSize:10,color:"#CBD5E1",textAlign:"center"}}>© 2026 청년ON</div>
        </>
      )}

      {/* 축소 시 즐겨찾기 수 뱃지 */}
    </aside>
  );
}

function TopNav({page,setPage,favIds,user,onLogout}){
  const mainPage=page==="detail"?"":["search","chatbot","mypage","community"].find(p=>page.startsWith(p))||"search";
  return(
    <header style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:"0 20px",position:"sticky",top:0,zIndex:50}}>
      <div style={{height:56,display:"flex",alignItems:"center",gap:0}}>
        <button onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:9,marginRight:24,background:"none",border:"none",cursor:"pointer",padding:0}}>
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:30,height:30,borderRadius:9}}/>
          <div style={{fontWeight:900,fontSize:15,color:"#111827"}}>청년ON</div>
        </button>
        <nav style={{display:"flex",gap:2,flex:1}}>
          {NAV_ITEMS.map(n=>(
            <button key={n.page} onClick={()=>setPage(n.page)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",background:mainPage===n.page?"#f8fafc":"transparent",color:mainPage===n.page?"#111827":"#6b7280",fontSize:13,lineHeight:1,fontWeight:mainPage===n.page?700:500,transition:"all 0.15s"}}>
              <Icon name={n.icon} size={15} color={mainPage===n.page?"#111827":"#6b7280"}/><span style={{lineHeight:1}}>{n.label}</span>
              {n.page==="mypage"&&favIds.size>0&&<span style={{marginLeft:2,fontSize:11,background:"#007FFF",color:"#fff",borderRadius:99,padding:"1px 6px"}}>{favIds.size}</span>}
            </button>
          ))}
        </nav>
        <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:8}}>
          {user?(
            <NavUserDropdown user={user} onLogout={onLogout} onGoMyPage={()=>setPage("mypage")} favCount={favIds.size}/>
          ):(
            <>
              <button onClick={()=>setPage("signup")} style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"white",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#111827";e.currentTarget.style.color="#111827";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#374151";}}
              >회원가입</button>
              <button onClick={()=>setPage("login")} style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#111827",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",transition:"opacity 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >로그인</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav({page,setPage,user}){
  const mainPage=["search","chatbot","mypage","community"].find(p=>page.startsWith(p))||"search";
  const visibleItems=NAV_ITEMS.filter(n=>n.page!=="mypage"||user);
  return(
    <nav style={{position:"fixed",bottom:0,left:0,right:0,background:"white",borderTop:"1px solid #e5e7eb",display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)"}}>
      {visibleItems.map(n=>(
        <button key={n.page} onClick={()=>setPage(n.page)} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:mainPage===n.page?"#111827":"#9ca3af",transition:"color 0.15s"}}>
          <Icon name={n.icon} size={22} color={mainPage===n.page?"#111827":"#9ca3af"}/>
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
  const [page,setPage]=useState("chatbot");
  const [detailPolicy,setDetailPolicy]=useState(null);
  const [fromPage,setFromPage]=useState("chatbot");
  const [favIds,setFavIds]=useLocalStorage("yoa:favs",new Set());
  const [mySub,setMySub]=useLocalStorage("yoa:mysub","info");
  const [user,setUser]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const bp=useBreakpoint();

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user??null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user??null));
    return()=>subscription.unsubscribe();
  },[]);

  const handleLogout=useCallback(async()=>{
    await supabase.auth.signOut();
    setUser(null);
  },[]);

  const toggleFav=useCallback(id=>{
    setFavIds(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
  },[setFavIds]);

  const goDetail=useCallback(policy=>{
    setFromPage(page);
    setDetailPolicy(policy);
    setPage("detail");
    history.replaceState({},"",`${window.location.pathname}?policy=${policy.id}`);
  },[page]);

  const goBack=useCallback(()=>{
    setDetailPolicy(null);
    setPage(fromPage);
    history.replaceState({},"",window.location.pathname);
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

  useEffect(()=>{
    if(policies.length<=12)return;
    const id=new URLSearchParams(window.location.search).get("policy");
    if(!id)return;
    const found=policies.find(p=>p.id===id);
    if(found)goDetail(found);
  },[policies]);

  const viewProps={favIds,onToggleFav:toggleFav,onGoDetail:goDetail,bp,setPage,policies,user};

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
    const exitAdmin=()=>{
      history.replaceState({},"",window.location.pathname);
      setAdminMode(false);
    };
    return <AdminShell onExit={exitAdmin}/>;
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
        <Sidebar page={page} setPage={navigateTo} favIds={favIds} user={user} open={sidebarOpen} setOpen={setSidebarOpen}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {!isDetail&&(
            <div style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:"0 32px",flexShrink:0}}>
              <div style={{height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>
                  {sidebarOpen?(
                    <>
                      {page==="search"&&<><Icon name="search" size={16} color="#111827"/> 검색</>}
                      {page==="chatbot"&&<><Icon name="chat" size={16} color="#111827"/> AI 챗봇</>}
                      {page==="mypage"&&<><Icon name="person" size={16} color="#111827"/> 마이페이지</>}
                      {page==="community"&&<><Icon name="forum" size={16} color="#111827"/> 커뮤니티</>}
                    </>
                  ):<span onClick={()=>window.location.reload()} style={{cursor:"pointer"}}>청년ON</span>}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>

                  {user?(
                    <NavUserDropdown user={user} onLogout={handleLogout} onGoMyPage={()=>navigateTo("mypage")} favCount={favIds.size}/>
                  ):(
                    <>
                      <button onClick={()=>navigateTo("signup")} style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"white",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="#111827";e.currentTarget.style.color="#111827";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#374151";}}
                      >회원가입</button>
                      <button onClick={()=>navigateTo("login")} style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#111827",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",transition:"opacity 0.15s"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                        onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                      >로그인</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {isDetail
              ?<div style={{flex:1,overflowY:"auto"}}><PolicyDetailView policy={detailPolicy} favIds={favIds} onToggle={toggleFav} onBack={goBack} onGoDetail={goDetailFromDetail} bp={bp} policies={policies}/></div>
              :page==="search"    ?<div style={{flex:1,overflow:"hidden"}}><SearchView {...viewProps}/></div>
              :page==="chatbot"   ?<div style={{flex:1,overflow:"hidden"}}><ChatBotView bp={bp}/></div>
              :page==="mypage"    ?<div style={{flex:1,overflowY:"auto"}}><MyPageContainer supabaseUser={user} onLogout={handleLogout} initialTab={mySub||"info"} favIds={favIds} policies={policies} onToggleFav={toggleFav}/></div>
              :page==="community" ?<div style={{flex:1,overflowY:"auto"}}><CommunityView bp={bp} user={user}/></div>
              :null
            }
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>
      {!isDetail&&(
        bp.isTablet
          ?<TopNav page={page} setPage={navigateTo} favIds={favIds} user={user} onLogout={handleLogout}/>
          :(
            <header style={{background:"white",borderBottom:"1px solid #e5e7eb",padding:"0 16px",position:"sticky",top:0,zIndex:50}}>
              <div style={{height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <button onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
                  <img src={import.meta.env.BASE_URL + 'logo.png'} alt="청년ON" style={{width:30,height:30,borderRadius:9}}/>
                  <div style={{fontWeight:900,fontSize:15,color:"#111827"}}>청년ON</div>
                </button>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{fontSize:12,color:favIds.size>0?"#b45309":"#9ca3af",fontWeight:600,display:"flex",alignItems:"center",gap:3}}><Icon name="star" filled={true} size={11} color={favIds.size>0?"#b45309":"#9ca3af"}/> {favIds.size}건</div>
                  {user?.user_metadata?.role==="admin"&&(
                    <button onClick={()=>window.location.hash="#admin"} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #fde68a",background:"#fffbeb",color:"#b45309",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="admin_panel_settings" size={14} color="#b45309"/></button>
                  )}
                  {user
                    ?<NavUserDropdown user={user} onLogout={handleLogout} onGoMyPage={()=>navigateTo("mypage")} compact favCount={favIds.size}/>
                    :<button onClick={()=>navigateTo("login")} style={{padding:"5px 12px",borderRadius:7,border:"none",background:"#111827",color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>로그인</button>
                  }
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
          :page==="mypage"    ?<MyPageContainer supabaseUser={user} onLogout={handleLogout} initialTab={mySub||"info"} favIds={favIds} policies={policies} onToggleFav={toggleFav}/>
          :page==="community" ?<CommunityView bp={bp} user={user}/>
          :null
        }
      </main>
      {!isDetail&&<BottomNav page={page} setPage={navigateTo} user={user}/>}
    </div>
  );
}
