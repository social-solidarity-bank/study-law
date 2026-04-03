import { useState, useEffect, useCallback, useRef } from "react";

// ─── Persistent Storage Helper (shared: true → 전 직원 공유) ───
const store = {
  async get(key) {
    try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; } catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val), true); } catch (e) { console.error("Storage error:", e); }
  },
  async list(prefix) {
    try { const r = await window.storage.list(prefix, true); return r?.keys || []; } catch { return []; }
  },
  async delete(key) {
    try { await window.storage.delete(key, true); } catch (e) { console.error("Storage delete error:", e); }
  },
};

// ─── Initial Data ───
const AXES = [
  { id: "policy", label: "정책 플랫폼", icon: "🏛️", color: "#E85D3A", desc: "Policy Positioning" },
  { id: "org", label: "조직·거버넌스", icon: "🔗", color: "#2D7DD2", desc: "Organization & Governance" },
  { id: "finance", label: "금융 구조", icon: "💰", color: "#45B69C", desc: "Finance Architecture" },
  { id: "data", label: "데이터·AI", icon: "📊", color: "#F0C808", desc: "Data & AI" },
  { id: "discourse", label: "담론·브랜딩", icon: "📢", color: "#97CC04", desc: "Discourse & Brand" },
];

const INITIAL_MINDMAP = {
  policy: {
    existing: ["기본법 행안위 통과 (2026.3)", "국정과제 채택", "지방정부협의회 7기 선언"],
    connections: ["CDFI Fund → 7가지 인증 요건", "CRA → 은행 의무적 지역 투자", "인도 PSL → 40% 우선부문 대출 의무"],
    gaps: ["한국형 CRA 입법은?", "CDFI 인증 제도 도입 가능성?", "시행령에 '사회연대금융 중개기관' 정의 포함?"],
  },
  org: {
    existing: ["행안부 주무부처 일원화", "사회연대경제위원회 설치 예정", "전국 지방정부협의회"],
    connections: ["미국 CDFI Coalition → 1,378개 기관 네트워크", "영국 BSC → 정부 독립 도매기관", "일본 신용금고 267개 지역밀착"],
    gaps: ["내부 전담 TF vs 랩 수준?", "지자체별 전달체계 재구축 방안?", "민관 협의체 설계 구조?"],
  },
  finance: {
    existing: ["SVS 기금 AUM 179억", "지자체 기금 누계 2,065억", "상호금융 상생협력대출 2,167억"],
    connections: ["CDFI Fund $33억 자산", "영국 BSC £40억 동원", "미국 ECIP $85.7억 자본확충", "CMF 1:30 레버리지"],
    gaps: ["도매-중개-소매 파이프라인 설계?", "유통시장(Secondary Market) 가능성?", "지방소멸대응기금 레버리지화?"],
  },
  data: {
    existing: ["한국가이드스타 7년 연속 최우수", "사업별 성과 데이터 내부 보유", "행안부 공공AX 추진"],
    connections: ["미국 FinRegLab 현금흐름 심사", "FICO XD 씬파일러 평가", "영국 CDFI 90% 상환율 추적", "IRIS+ 5.3c IMM 프레임워크"],
    gaps: ["AI 심사모델 개발 현황?", "IMM 프레임워크 도입 계획?", "핵심 성과 수치 독립 검증?"],
  },
  discourse: {
    existing: ["22년 누적 64,876건 자립지원", "다국적 파트너십 (JP모건·HSBC·하나·삼성)", "연간보고서 '금융의 경계를 넘어'"],
    connections: ["미국 CDFI → 30년 실적으로 초당적 지지 확보", "영국 RF → 차주 이자절약 £2,900만 수치화", "'퍼주기' 반론 = 재정 레버리지 실증"],
    gaps: ["JP모건 매출 35.7% 증가 출처 확보?", "KDB 생존율 52% 독립 검증?", "정량적 재정레버리지 효과 산출?"],
  },
};

const INITIAL_TIMELINE = [
  { id: "t1", date: "2026.03", label: "기본법 행안위 통과", status: "done", axis: "policy" },
  { id: "t2", date: "2026.04", label: "본회의 의결 (예상)", status: "upcoming", axis: "policy" },
  { id: "t3", date: "2026.05", label: "법률 공포", status: "upcoming", axis: "policy" },
  { id: "t4", date: "2026.Q2", label: "TF 발족 · 이해관계자 맵 완성", status: "todo", axis: "org" },
  { id: "t5", date: "2026.Q3", label: "정책 브리프 1차 · 파일럿 설계", status: "todo", axis: "discourse" },
  { id: "t6", date: "2026.Q3", label: "시행령 제정 초안 공개 (예상)", status: "upcoming", axis: "policy" },
  { id: "t7", date: "2026.Q4", label: "파일럿 1개 지역 착수", status: "todo", axis: "finance" },
  { id: "t8", date: "2026.Q4", label: "성과지표·대시보드 초안", status: "todo", axis: "data" },
  { id: "t9", date: "2026.11", label: "시행령 확정 (목표)", status: "upcoming", axis: "policy" },
  { id: "t10", date: "2027.Q1", label: "파일럿 평가 · 정책제안서 제출", status: "todo", axis: "policy" },
];

const INITIAL_CARDS = [
  { id: "c1", name: "함께온기금", axis: "finance", owner: "", status: "운영중", lawConnection: "사회연대금융 중개기관 역할 근거", expansion: "AI 심사모델 적용 가능성", metric: "", notes: "" },
  { id: "c2", name: "경기극저신용대출", axis: "finance", owner: "", status: "사업종료", lawConnection: "지자체 기금 연계 모델 레퍼런스", expansion: "타 지자체 복제 가능성", metric: "연 1%, 50~100만원, 5년 만기", notes: "" },
  { id: "c3", name: "프로젝트 다시봄", axis: "policy", owner: "", status: "운영중", lawConnection: "지역문제 해결형 혁신모델", expansion: "행안부 혁신모델 공모 연계", metric: "", notes: "" },
  { id: "c4", name: "JP모건 히든히어로", axis: "finance", owner: "", status: "운영중", lawConnection: "민간 파트너십 기반 성장솔루션", expansion: "성과 데이터 독립 검증 → 정책 근거화", metric: "매출 35.7% 증가 (출처 확인 필요)", notes: "" },
  { id: "c5", name: "하나 파워온스토어", axis: "finance", owner: "", status: "운영중", lawConnection: "시중은행-사회적금융 협력 모델", expansion: "한국형 BEA(은행어워드) 레퍼런스", metric: "", notes: "" },
  { id: "c6", name: "KDB 창업기금", axis: "finance", owner: "", status: "운영중", lawConnection: "정책금융기관 연계 중개 모델", expansion: "5년 생존율 52% 검증 → 제도화 근거", metric: "177명 창업대출, 9차 운영", notes: "" },
  { id: "c7", name: "두나무 넥스트잡", axis: "org", owner: "", status: "종료", lawConnection: "청년 자립 지원 → 사회연대경제 인재", expansion: "자립준비청년 연계 확대", metric: "2022.6~2024.12", notes: "" },
  { id: "c8", name: "HSBC 하이파이브", axis: "org", owner: "", status: "운영중", lawConnection: "보호종료청소년 자립 = 사회안전망", expansion: "사회성과연계(SIB) 구조 실험", metric: "만 16~18세 대상", notes: "" },
  { id: "c9", name: "신용 Step-Up", axis: "data", owner: "", status: "운영중", lawConnection: "씬파일러 신용구축 = 금융포용", expansion: "현금흐름 기반 평가모델 접목", metric: "", notes: "" },
  { id: "c10", name: "The Terrace", axis: "discourse", owner: "", status: "운영중", lawConnection: "청년 로컬창업 = 지방소멸 대응", expansion: "지자체 혁신모델 공모 연계", metric: "", notes: "" },
];

const INITIAL_SCENARIOS = [
  { id: "s1", title: "상호금융중앙회 기금 조성이 시행령에 포함되면?", axis: "finance", impact: "사회연대은행이 중개기관으로 지정될 가능성. 신협 상생협력대출(2,167억)과 연계하여 도매-중개 파이프라인 구축 가능.", preparation: "신협중앙회와 사전 협의, 중개 역량 증빙 자료 준비", contributions: [] },
  { id: "s2", title: "한국형 CRA가 3년 내 입법되면?", axis: "policy", impact: "시중 은행의 의무적 지역 투자 → 사회연대은행이 전문 심사·집행 파트너로 부상. 미국 BEA 모델처럼 은행 투자 인센티브와 연동 가능.", preparation: "CRA 입법 동향 모니터링, 미국·인도 사례 비교연구 발간, 금융위 정책 제안", contributions: [] },
  { id: "s3", title: "지방소멸대응기금에 레버리지 조항이 신설되면?", axis: "finance", impact: "연 1조 기금 중 일부가 대출손실준비금·보증재원으로 전환 → CMF 모델(1:30 레버리지) 벤치마킹 가능. 지방 청년주택·로컬벤처에 민간자본 유인.", preparation: "CMF 모델 한국 적용 시뮬레이션, 파일럿 지자체 선정, 집행률 31.9% 문제 해결안 제시", contributions: [] },
  { id: "s4", title: "행안부 AI·AX 기조에 사회적금융 데이터가 포함되면?", axis: "data", impact: "성과측정 플랫폼이 정부 표준으로 채택될 가능성. AI 심사모델을 선제 개발한 기관이 레퍼런스 독점.", preparation: "IMM 프레임워크(IRIS+ 5차원) 기반 데이터 체계 구축, FinRegLab 현금흐름 심사 파일럿", contributions: [] },
  { id: "s5", title: "사회연대경제기본법 5년 기본계획에 '중개기관 인증'이 포함되면?", axis: "org", impact: "한국형 CDFI 인증 제도의 사실상 출발점. 7가지 인증 요건(법인격, 주요임무, 금융기능, 대상시장 60%, 개발서비스, 책임성, 비정부) 중 사회연대은행은 대부분 충족.", preparation: "미국 CDFI 인증 7요건 대비 자체 갭분석 완료, 부족 요건 보완 계획 수립", contributions: [] },
];

const REFERENCE_DATA = [
  { category: "미국 CDFI", items: [
    { label: "인증기관 수 (2025 Q2)", value: "1,378개", trend: "↓6%", source: "뉴욕연준 2026.2" },
    { label: "총 운용자산", value: "$4,460억", trend: "↓3%", source: "뉴욕연준 2026.2" },
    { label: "CDFI Fund 예산 (FY2026)", value: "$3.24억", trend: "→유지", source: "OFN 2026.3" },
    { label: "NMTC 영구화", value: "연 $50억", trend: "↑신규", source: "재무부 2025" },
    { label: "ECIP 투자 규모", value: "$85.7억", trend: "", source: "재무부 2025" },
    { label: "BML 30일 연체 10%초과 기관", value: "11/61개", trend: "↑주의", source: "Aeris 2025.5" },
  ]},
  { category: "영국 BSC·CDFI", items: [
    { label: "BSC 누적 투자", value: "£10억+", trend: "↑", source: "BSC 2025" },
    { label: "BSC 자본 동원 총액", value: "£40억+", trend: "↑", source: "BSC 2025" },
    { label: "영국 사회적임팩트 시장", value: "£112억", trend: "↑12배(vs 2011)", source: "BSC Market Sizing 2024" },
    { label: "영국 CDFI 기업대출 (2024)", value: "£1.42억", trend: "↑39%", source: "Responsible Finance 2025" },
    { label: "영국 CDFI 차주 상환율", value: "~90%", trend: "→", source: "Responsible Finance 2025" },
  ]},
  { category: "한국 현황", items: [
    { label: "SVS 기금 AUM", value: "179억 원", trend: "", source: "SVS 2023 연차보고서" },
    { label: "지자체 사회적경제기금 누계", value: "2,065억 원", trend: "", source: "SVS 동향보고서 2025" },
    { label: "지방소멸대응기금 집행률", value: "31.9%", trend: "↓우려", source: "나라살림연구소 2024" },
    { label: "지역재투자 비수도권 여신 비중", value: "34.5%", trend: "", source: "금융위 2025" },
    { label: "신협 상생협력대출 누적", value: "2,167억 원", trend: "↑", source: "신협중앙회 2025" },
    { label: "서민금융 공급 (근로자햇살론)", value: "2.8조 원", trend: "↓26%", source: "서민금융진흥원 2024" },
  ]},
  { category: "사회연대은행", items: [
    { label: "누적 자립지원", value: "64,876건", trend: "", source: "사회연대은행 2024" },
    { label: "소상공인 창업 지원", value: "5,279건", trend: "", source: "사회연대은행 2024" },
    { label: "사회혁신조직 지원", value: "2,539개", trend: "", source: "사회연대은행 2024" },
    { label: "가이드스타 등급", value: "7년 연속 최우수", trend: "→", source: "한국가이드스타" },
    { label: "직원 수", value: "~43명", trend: "", source: "사회연대은행" },
  ]},
];

// ─── OKR Initial Data ───
const INITIAL_OKR = {
  companyObjective: "사회연대경제기본법 시대에 사회연대은행을 사회연대금융 핵심 인프라로 자리매김한다",
  period: "2026.Q2 → 2027.Q1 (시행령 확정 전후 12개월)",
  axes: [
    {
      axis: "policy", objective: "기본법·시행령 설계 과정에 실질적 영향력을 행사한다",
      keyResults: [
        { id: "kr-p1", text: "정책·입법 제안서 2건 이상 제출 (시행령 초안 의견서 포함)", current: 0, target: 2, unit: "건" },
        { id: "kr-p2", text: "사회연대경제위원회 또는 지역위원회 참여 공식 요청 1건", current: 0, target: 1, unit: "건" },
        { id: "kr-p3", text: "외부 포럼·정책 토론회·국회 토론회 참여 6회 이상", current: 0, target: 6, unit: "회" },
      ],
    },
    {
      axis: "org", objective: "기본법 대응 전담체계를 구축하고 외부 협력망을 확보한다",
      keyResults: [
        { id: "kr-o1", text: "기본법 대응 TF 발족 (Q2 내)", current: 0, target: 1, unit: "팀" },
        { id: "kr-o2", text: "지자체·중간지원기관·연구기관 협력 파트너십 3건 체결", current: 0, target: 3, unit: "건" },
        { id: "kr-o3", text: "전국 사회연대경제 지방정부협의회 공동 사업 1건 기획", current: 0, target: 1, unit: "건" },
      ],
    },
    {
      axis: "finance", objective: "사회연대금융 중개기관으로서의 실행 레퍼런스를 만든다",
      keyResults: [
        { id: "kr-f1", text: "지자체 기금 연계 파일럿 1~2개 지역 착수", current: 0, target: 2, unit: "개" },
        { id: "kr-f2", text: "사회연대금융 포트폴리오 2025년 대비 30% 이상 확대", current: 0, target: 30, unit: "%" },
        { id: "kr-f3", text: "도매-중개-소매 금융 구조 설계안 1건 발표", current: 0, target: 1, unit: "건" },
      ],
    },
    {
      axis: "data", objective: "데이터 기반 성과관리 체계를 구축하여 정책 근거를 확보한다",
      keyResults: [
        { id: "kr-d1", text: "성과지표 체계(IMM) 포트폴리오 80% 이상 적용", current: 0, target: 80, unit: "%" },
        { id: "kr-d2", text: "핵심 성과 수치(JP모건 매출, KDB 생존율) 독립 검증 완료", current: 0, target: 2, unit: "건" },
        { id: "kr-d3", text: "AI 심사모델 또는 현금흐름 기반 평가 파일럿 설계 착수", current: 0, target: 1, unit: "건" },
      ],
    },
    {
      axis: "discourse", objective: "'퍼주기' 프레임을 넘어서는 실증적 담론을 구축한다",
      keyResults: [
        { id: "kr-b1", text: "정책 브리프(분기별) 3편 이상 발간", current: 0, target: 3, unit: "편" },
        { id: "kr-b2", text: "CDFI·BSC 국제 비교연구 보고서 1건 발표", current: 0, target: 1, unit: "건" },
        { id: "kr-b3", text: "정책·언론 인용 또는 외부 레퍼런스 5건 이상", current: 0, target: 5, unit: "건" },
      ],
    },
  ],
};

// ─── Utility ───
const cx = (...classes) => classes.filter(Boolean).join(" ");
const getAxisColor = (axisId) => AXES.find((a) => a.id === axisId)?.color || "#888";
const getAxisIcon = (axisId) => AXES.find((a) => a.id === axisId)?.icon || "📌";

// ─── Main App ───
export default function App() {
  const [tab, setTab] = useState("mindmap");
  const [mindmap, setMindmap] = useState(INITIAL_MINDMAP);
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE);
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [scenarios, setScenarios] = useState(INITIAL_SCENARIOS);
  const [okr, setOkr] = useState(INITIAL_OKR);
  const [loaded, setLoaded] = useState(false);
  const [lastSync, setLastSync] = useState("");

  // Load from shared storage
  const loadAll = useCallback(async () => {
    const mm = await store.get("ssb-mindmap");
    const tl = await store.get("ssb-timeline");
    const sc = await store.get("ssb-scenarios");
    const ok = await store.get("ssb-okr");
    if (mm) setMindmap(mm);
    if (tl) setTimeline(tl);
    if (sc) setScenarios(sc);
    if (ok) setOkr(ok);
    // Cards: load individual keys then fallback to bulk
    const cardKeys = await store.list("ssb-card:");
    if (cardKeys.length > 0) {
      const loaded_cards = [];
      for (const k of cardKeys) {
        const c = await store.get(k);
        if (c) loaded_cards.push(c);
      }
      if (loaded_cards.length > 0) setCards(loaded_cards);
    } else {
      const bulk = await store.get("ssb-cards");
      if (bulk) setCards(bulk);
    }
    setLastSync(new Date().toLocaleTimeString("ko"));
  }, []);

  useEffect(() => { loadAll().then(() => setLoaded(true)); }, [loadAll]);

  // Auto-save (mindmap, timeline, scenarios as bulk; cards as individual keys)
  useEffect(() => { if (loaded) store.set("ssb-mindmap", mindmap); }, [mindmap, loaded]);
  useEffect(() => { if (loaded) store.set("ssb-timeline", timeline); }, [timeline, loaded]);
  useEffect(() => { if (loaded) store.set("ssb-scenarios", scenarios); }, [scenarios, loaded]);
  useEffect(() => { if (loaded) store.set("ssb-okr", okr); }, [okr, loaded]);
  useEffect(() => {
    if (!loaded) return;
    cards.forEach((c) => store.set("ssb-card:" + c.id, c));
  }, [cards, loaded]);

  const tabs = [
    { id: "mindmap", label: "마인드맵", icon: "🧠" },
    { id: "timeline", label: "타임라인", icon: "📅" },
    { id: "cards", label: "사업 카드", icon: "🗂️" },
    { id: "reference", label: "비교연구", icon: "🌍" },
    { id: "whatif", label: "What If", icon: "💡" },
    { id: "okr", label: "OKR", icon: "🎯" },
  ];

  const resetAll = async () => {
    if (confirm("모든 데이터를 초기 상태로 되돌립니다. 계속하시겠습니까?")) {
      setMindmap(INITIAL_MINDMAP);
      setTimeline(INITIAL_TIMELINE);
      setCards(INITIAL_CARDS);
      setScenarios(INITIAL_SCENARIOS);
      setOkr(INITIAL_OKR);
    }
  };

  const exportBackup = () => {
    const data = { mindmap, timeline, cards, scenarios, okr, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ssb-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef(null);
  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.mindmap || !data.cards) { alert("올바른 백업 파일이 아닙니다."); return; }
        if (!confirm(`${data.exportedAt ? new Date(data.exportedAt).toLocaleString("ko") + " 시점의" : ""} 백업을 복원합니다. 현재 데이터를 덮어씁니다. 계속할까요?`)) return;
        setMindmap(data.mindmap);
        setTimeline(data.timeline);
        setCards(data.cards);
        setScenarios(data.scenarios);
        if (data.okr) setOkr(data.okr);
      } catch { alert("파일을 읽을 수 없습니다."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", background: "#0C0E12", color: "#E8E6E1", minHeight: "100vh" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        textarea, input, select { font-family: inherit; }
        .tab-btn { padding: 10px 16px; border: none; background: transparent; color: #888; cursor: pointer; font-size: 14px; font-weight: 600; border-bottom: 2px solid transparent; transition: all .2s; white-space: nowrap; }
        .tab-btn:hover { color: #ccc; }
        .tab-btn.active { color: #E8E6E1; border-bottom-color: #E85D3A; }
        .card { background: #16181D; border: 1px solid #2A2D35; border-radius: 12px; padding: 20px; transition: border-color .2s; }
        .card:hover { border-color: #444; }
        .axis-tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: .5px; }
        .btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #333; background: #1E2028; color: #E8E6E1; cursor: pointer; font-size: 13px; font-weight: 600; transition: all .2s; }
        .btn:hover { background: #2A2D35; border-color: #555; }
        .btn-primary { background: #E85D3A; border-color: #E85D3A; color: white; }
        .btn-primary:hover { background: #d14e2d; }
        .input { width: 100%; padding: 8px 12px; background: #1E2028; border: 1px solid #2A2D35; border-radius: 8px; color: #E8E6E1; font-size: 13px; outline: none; }
        .input:focus { border-color: #E85D3A; }
        .input::placeholder { color: #555; }
        .status-done { color: #45B69C; }
        .status-upcoming { color: #F0C808; }
        .status-todo { color: #666; }
        .gap-item { background: #1A1215; border: 1px dashed #E85D3A55; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #E85D3A; cursor: pointer; transition: all .2s; }
        .gap-item:hover { background: #251A1E; border-color: #E85D3A; }
        .fade-in { animation: fadeIn .4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header style={{ padding: "24px 32px 0", borderBottom: "1px solid #1E2028" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#E85D3A", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Social Solidarity Bank · Strategy OS</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3, color: "#E8E6E1" }}>사회연대경제기본법 시대, 우리의 상상력을 확장하다</h1>
            <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>5축 전략 프레임워크 · 전 직원 참여형 리서치 대시보드 · 2026.11 시행령 목표</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn" onClick={exportBackup} style={{ fontSize: 11 }}>💾 백업</button>
            <button className="btn" onClick={() => fileInputRef.current?.click()} style={{ fontSize: 11 }}>📂 복원</button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={importBackup} style={{ display: "none" }} />
            <button className="btn" onClick={resetAll} style={{ fontSize: 11 }}>🔄 초기화</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "8px 14px", background: "#1A1C22", borderRadius: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#45B69C", fontWeight: 700 }}>🟢 공유 모드</span>
          <span style={{ fontSize: 11, color: "#666" }}>모든 직원의 편집이 같은 데이터에 반영됩니다</span>
          <button className="btn" onClick={async () => { await loadAll(); }} style={{ fontSize: 11, padding: "4px 10px", marginLeft: "auto" }}>🔄 최신 데이터 불러오기</button>
          {lastSync && <span style={{ fontSize: 10, color: "#444" }}>마지막 동기화: {lastSync}</span>}
        </div>
        <nav style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 0 }}>
          {tabs.map((t) => (
            <button key={t.id} className={cx("tab-btn", tab === t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main style={{ padding: "24px 32px 48px" }} className="fade-in" key={tab}>
        {tab === "mindmap" && <MindmapView mindmap={mindmap} setMindmap={setMindmap} />}
        {tab === "timeline" && <TimelineView timeline={timeline} setTimeline={setTimeline} />}
        {tab === "cards" && <CardsView cards={cards} setCards={setCards} />}
        {tab === "reference" && <ReferenceView />}
        {tab === "whatif" && <WhatIfView scenarios={scenarios} setScenarios={setScenarios} />}
        {tab === "okr" && <OkrView okr={okr} setOkr={setOkr} />}
      </main>
    </div>
  );
}

// ─── 1. MindMap View ───
function MindmapView({ mindmap, setMindmap }) {
  const [selectedAxis, setSelectedAxis] = useState("policy");
  const [newGap, setNewGap] = useState("");
  const data = mindmap[selectedAxis];

  const addGap = () => {
    if (!newGap.trim()) return;
    const updated = { ...mindmap, [selectedAxis]: { ...data, gaps: [...data.gaps, newGap.trim()] } };
    setMindmap(updated);
    setNewGap("");
  };

  const removeGap = (idx) => {
    const updated = { ...mindmap, [selectedAxis]: { ...data, gaps: data.gaps.filter((_, i) => i !== idx) } };
    setMindmap(updated);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>5축별로 "이미 있는 것", "해외 연결점", 그리고 <span style={{ color: "#E85D3A" }}>아직 채워야 할 빈 칸</span>을 탐색합니다. 빈 칸은 스터디의 출발점입니다.</p>

      {/* Axis Selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {AXES.map((a) => (
          <button key={a.id} onClick={() => setSelectedAxis(a.id)} style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${selectedAxis === a.id ? a.color : "#2A2D35"}`, background: selectedAxis === a.id ? a.color + "18" : "transparent", color: selectedAxis === a.id ? a.color : "#888", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all .2s" }}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Existing */}
        <div className="card">
          <h3 style={{ fontSize: 13, color: "#45B69C", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>✅ 이미 있는 것</h3>
          {data.existing.map((item, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1E2028", fontSize: 13, color: "#ccc" }}>{item}</div>
          ))}
        </div>

        {/* Global Connections */}
        <div className="card">
          <h3 style={{ fontSize: 13, color: "#2D7DD2", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>🌐 해외 연결점</h3>
          {data.connections.map((item, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1E2028", fontSize: 13, color: "#ccc" }}>{item}</div>
          ))}
        </div>

        {/* Gaps */}
        <div className="card" style={{ borderColor: "#E85D3A33" }}>
          <h3 style={{ fontSize: 13, color: "#E85D3A", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>❓ 빈 칸 (스터디 과제)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.gaps.map((item, i) => (
              <div key={i} className="gap-item" onClick={() => { if (confirm(`"${item}" 항목을 제거할까요?`)) removeGap(i); }}>
                {item}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input className="input" placeholder="새로운 질문을 추가하세요..." value={newGap} onChange={(e) => setNewGap(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGap()} />
            <button className="btn btn-primary" onClick={addGap}>추가</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Timeline View ───
function TimelineView({ timeline, setTimeline }) {
  const [newItem, setNewItem] = useState({ date: "", label: "", axis: "policy" });

  const addItem = () => {
    if (!newItem.date || !newItem.label) return;
    setTimeline([...timeline, { id: "t" + Date.now(), ...newItem, status: "todo" }]);
    setNewItem({ date: "", label: "", axis: "policy" });
  };

  const cycleStatus = (id) => {
    const order = ["todo", "upcoming", "done"];
    setTimeline(timeline.map((t) => t.id === id ? { ...t, status: order[(order.indexOf(t.status) + 1) % 3] } : t));
  };

  const removeItem = (id) => setTimeline(timeline.filter((t) => t.id !== id));

  const statusLabel = { done: "완료", upcoming: "예정", todo: "할일" };
  const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>법안 공포 → 시행령 준비(11월 목표)까지의 정책 일정과 내부 액션을 병렬 추적합니다. 상태를 클릭하면 전환됩니다.</p>

      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #E85D3A, #2D7DD2, #45B69C)" }} />
        {sorted.map((item) => (
          <div key={item.id} style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start", position: "relative" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: getAxisColor(item.axis), marginTop: 5, flexShrink: 0, position: "relative", left: -18, border: "2px solid #0C0E12" }} />
            <div className="card" style={{ flex: 1, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 11, color: "#666", fontWeight: 700, marginRight: 10 }}>{item.date}</span>
                <span className="axis-tag" style={{ background: getAxisColor(item.axis) + "20", color: getAxisColor(item.axis), marginRight: 8 }}>{getAxisIcon(item.axis)}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className={`btn status-${item.status}`} onClick={() => cycleStatus(item.id)} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {statusLabel[item.status]}
                </button>
                <button className="btn" onClick={() => removeItem(item.id)} style={{ fontSize: 11, padding: "4px 8px", color: "#666" }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="card" style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" style={{ flex: "0 0 120px" }} placeholder="시기 (예: 2026.Q3)" value={newItem.date} onChange={(e) => setNewItem({ ...newItem, date: e.target.value })} />
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="마일스톤 내용" value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} />
        <select className="input" style={{ flex: "0 0 140px" }} value={newItem.axis} onChange={(e) => setNewItem({ ...newItem, axis: e.target.value })}>
          {AXES.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
        </select>
        <button className="btn btn-primary" onClick={addItem}>+ 추가</button>
      </div>
    </div>
  );
}

// ─── 3. Cards View ───
function CardsView({ cards, setCards }) {
  const [filter, setFilter] = useState("all");
  const [editId, setEditId] = useState(null);

  const updateCard = (id, field, value) => {
    setCards(cards.map((c) => c.id === id ? { ...c, [field]: value, lastEdited: new Date().toLocaleString("ko") } : c));
  };

  const addCard = () => {
    const newCard = { id: "c" + Date.now(), name: "새 사업", axis: "finance", owner: "", status: "기획중", lawConnection: "", expansion: "", metric: "", notes: "" };
    setCards([...cards, newCard]);
    setEditId(newCard.id);
  };

  const removeCard = (id) => {
    if (confirm("이 카드를 삭제할까요?")) {
      setCards(cards.filter((c) => c.id !== id));
      store.delete("ssb-card:" + id);
      if (editId === id) setEditId(null);
    }
  };

  const filtered = filter === "all" ? cards : cards.filter((c) => c.axis === filter);

  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>각 사업 담당자가 자기 카드를 직접 업데이트합니다. "기본법과의 연결점"과 "확장 가능성"을 채우는 것이 핵심입니다.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button className={cx("btn", filter === "all" && "btn-primary")} onClick={() => setFilter("all")}>전체</button>
        {AXES.map((a) => (
          <button key={a.id} className="btn" onClick={() => setFilter(a.id)} style={{ borderColor: filter === a.id ? a.color : undefined, color: filter === a.id ? a.color : undefined }}>
            {a.icon} {a.label}
          </button>
        ))}
        <button className="btn btn-primary" onClick={addCard} style={{ marginLeft: "auto" }}>+ 사업 추가</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {filtered.map((card) => (
          <div key={card.id} className="card" style={{ borderLeft: `3px solid ${getAxisColor(card.axis)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span className="axis-tag" style={{ background: getAxisColor(card.axis) + "20", color: getAxisColor(card.axis) }}>{getAxisIcon(card.axis)}</span>
                {editId === card.id ? (
                  <input className="input" style={{ display: "inline-block", width: 160, marginLeft: 8, fontSize: 15, fontWeight: 700 }} value={card.name} onChange={(e) => updateCard(card.id, "name", e.target.value)} />
                ) : (
                  <span style={{ fontSize: 16, fontWeight: 700, marginLeft: 8 }}>{card.name}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setEditId(editId === card.id ? null : card.id)}>{editId === card.id ? "완료" : "편집"}</button>
                <button className="btn" style={{ fontSize: 11, padding: "2px 8px", color: "#666" }} onClick={() => removeCard(card.id)}>✕</button>
              </div>
            </div>

            {editId === card.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div><label style={labelStyle}>담당자</label><input className="input" value={card.owner} onChange={(e) => updateCard(card.id, "owner", e.target.value)} placeholder="이름 입력" /></div>
                <div><label style={labelStyle}>상태</label>
                  <select className="input" value={card.status} onChange={(e) => updateCard(card.id, "status", e.target.value)}>
                    {["기획중", "운영중", "사업종료", "종료", "확장검토"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>축</label>
                  <select className="input" value={card.axis} onChange={(e) => updateCard(card.id, "axis", e.target.value)}>
                    {AXES.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>기본법 연결점</label><textarea className="input" rows={2} value={card.lawConnection} onChange={(e) => updateCard(card.id, "lawConnection", e.target.value)} placeholder="이 사업이 기본법과 어떻게 연결되는가?" /></div>
                <div><label style={labelStyle}>확장 가능성</label><textarea className="input" rows={2} value={card.expansion} onChange={(e) => updateCard(card.id, "expansion", e.target.value)} placeholder="법 시행 후 어떤 확장이 가능한가?" /></div>
                <div><label style={labelStyle}>성과 데이터</label><input className="input" value={card.metric} onChange={(e) => updateCard(card.id, "metric", e.target.value)} placeholder="핵심 수치" /></div>
                <div><label style={labelStyle}>메모</label><textarea className="input" rows={2} value={card.notes} onChange={(e) => updateCard(card.id, "notes", e.target.value)} placeholder="자유 메모" /></div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#aaa" }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#666", fontSize: 11 }}>상태:</span> <span style={{ fontWeight: 600 }}>{card.status}</span>
                  {card.owner && <span style={{ marginLeft: 12, color: "#666", fontSize: 11 }}>담당: <span style={{ color: "#ccc" }}>{card.owner}</span></span>}
                </div>
                {card.lawConnection && <div style={{ marginBottom: 4 }}><span style={{ color: "#45B69C", fontSize: 11 }}>⚖️ 기본법 연결:</span> {card.lawConnection}</div>}
                {card.expansion && <div style={{ marginBottom: 4 }}><span style={{ color: "#F0C808", fontSize: 11 }}>🚀 확장:</span> {card.expansion}</div>}
                {card.metric && <div style={{ marginBottom: 4 }}><span style={{ color: "#2D7DD2", fontSize: 11 }}>📊 성과:</span> {card.metric}</div>}
                {card.notes && <div style={{ marginTop: 8, padding: 8, background: "#1E2028", borderRadius: 6, fontSize: 12, color: "#888" }}>{card.notes}</div>}
                {card.lastEdited && <div style={{ marginTop: 8, fontSize: 10, color: "#444" }}>✏️ 마지막 수정: {card.lastEdited}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 4, letterSpacing: .5 };

// ─── 4. Reference View ───
function ReferenceView() {
  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>CDFI·BSC·한국 현황의 핵심 지표를 한눈에 비교합니다. 새 자료를 발견하면 스터디에서 공유하세요.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {REFERENCE_DATA.map((group) => (
          <div key={group.category} className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#E8E6E1" }}>{group.category}</h3>
            {group.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid #1E2028" }}>
                <span style={{ fontSize: 13, color: "#aaa", flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#E8E6E1", marginLeft: 8 }}>{item.value}</span>
                {item.trend && <span style={{ fontSize: 11, color: item.trend.includes("↓") || item.trend.includes("우려") ? "#E85D3A" : item.trend.includes("↑") || item.trend.includes("신규") ? "#45B69C" : "#666", marginLeft: 6, fontWeight: 700 }}>{item.trend}</span>}
              </div>
            ))}
            <div style={{ fontSize: 10, color: "#444", marginTop: 8 }}>출처: {group.items.map((i) => i.source).filter((v, i, a) => a.indexOf(v) === i).join(" / ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 5. What If View ───
function WhatIfView({ scenarios, setScenarios }) {
  const [expandedId, setExpandedId] = useState(null);
  const [newContrib, setNewContrib] = useState("");

  const addContribution = (id) => {
    if (!newContrib.trim()) return;
    setScenarios(scenarios.map((s) => s.id === id ? { ...s, contributions: [...s.contributions, { text: newContrib.trim(), author: "익명", date: new Date().toLocaleDateString("ko") }] } : s));
    setNewContrib("");
  };

  const updateField = (id, field, value) => {
    setScenarios(scenarios.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const addScenario = () => {
    const ns = { id: "s" + Date.now(), title: "새 시나리오", axis: "policy", impact: "", preparation: "", contributions: [] };
    setScenarios([...scenarios, ns]);
    setExpandedId(ns.id);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>"만약에…"로 시작하는 시나리오를 탐색합니다. 예상 임팩트와 준비 사항을 함께 토론하고, 아이디어를 직접 추가하세요.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {scenarios.map((sc) => (
          <div key={sc.id} className="card" style={{ borderLeft: `3px solid ${getAxisColor(sc.axis)}`, cursor: "pointer" }}>
            <div onClick={() => setExpandedId(expandedId === sc.id ? null : sc.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="axis-tag" style={{ background: getAxisColor(sc.axis) + "20", color: getAxisColor(sc.axis), marginRight: 8 }}>{getAxisIcon(sc.axis)}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{sc.title}</span>
              </div>
              <span style={{ color: "#666", fontSize: 18 }}>{expandedId === sc.id ? "−" : "+"}</span>
            </div>

            {expandedId === sc.id && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }} className="fade-in">
                <div>
                  <label style={labelStyle}>시나리오 제목</label>
                  <input className="input" value={sc.title} onChange={(e) => updateField(sc.id, "title", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>예상 임팩트</label>
                  <textarea className="input" rows={3} value={sc.impact} onChange={(e) => updateField(sc.id, "impact", e.target.value)} placeholder="이 시나리오가 현실이 되면 사회연대은행에 어떤 변화가?" />
                </div>
                <div>
                  <label style={labelStyle}>필요한 준비</label>
                  <textarea className="input" rows={3} value={sc.preparation} onChange={(e) => updateField(sc.id, "preparation", e.target.value)} placeholder="지금부터 무엇을 준비해야 하는가?" />
                </div>

                {/* Contributions */}
                <div style={{ background: "#1A1C22", borderRadius: 8, padding: 16 }}>
                  <label style={{ ...labelStyle, color: "#97CC04" }}>💬 팀 아이디어 ({sc.contributions.length})</label>
                  {sc.contributions.map((c, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #2A2D35", fontSize: 13, color: "#ccc" }}>
                      <span style={{ color: "#666", fontSize: 11 }}>{c.author} · {c.date}</span>
                      <div style={{ marginTop: 4 }}>{c.text}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input className="input" placeholder="아이디어를 남겨주세요..." value={expandedId === sc.id ? newContrib : ""} onChange={(e) => setNewContrib(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addContribution(sc.id)} />
                    <button className="btn btn-primary" onClick={() => addContribution(sc.id)}>등록</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn" onClick={addScenario} style={{ marginTop: 16, width: "100%" }}>+ 새 시나리오 추가</button>
    </div>
  );
}

// ─── 6. OKR View ───
function OkrView({ okr, setOkr }) {
  const updateKR = (axisIdx, krIdx, field, value) => {
    const newAxes = okr.axes.map((a, ai) => ai === axisIdx ? {
      ...a, keyResults: a.keyResults.map((kr, ki) => ki === krIdx ? { ...kr, [field]: field === "current" || field === "target" ? Number(value) || 0 : value } : kr)
    } : a);
    setOkr({ ...okr, axes: newAxes });
  };

  const addKR = (axisIdx) => {
    const newAxes = okr.axes.map((a, ai) => ai === axisIdx ? {
      ...a, keyResults: [...a.keyResults, { id: "kr-" + Date.now(), text: "새 Key Result", current: 0, target: 1, unit: "건" }]
    } : a);
    setOkr({ ...okr, axes: newAxes });
  };

  const removeKR = (axisIdx, krIdx) => {
    const newAxes = okr.axes.map((a, ai) => ai === axisIdx ? {
      ...a, keyResults: a.keyResults.filter((_, ki) => ki !== krIdx)
    } : a);
    setOkr({ ...okr, axes: newAxes });
  };

  // Overall progress
  const allKRs = okr.axes.flatMap((a) => a.keyResults);
  const overallProgress = allKRs.length > 0 ? Math.round(allKRs.reduce((sum, kr) => sum + Math.min(100, (kr.current / kr.target) * 100), 0) / allKRs.length) : 0;

  return (
    <div>
      {/* Company Objective */}
      <div className="card" style={{ marginBottom: 24, borderLeft: "3px solid #E85D3A" }}>
        <div style={{ fontSize: 11, color: "#E85D3A", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🎯 전사 Objective</div>
        <input className="input" style={{ fontSize: 16, fontWeight: 700, background: "transparent", border: "none", padding: 0, color: "#E8E6E1" }} value={okr.companyObjective} onChange={(e) => setOkr({ ...okr, companyObjective: e.target.value })} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#666" }}>{okr.period}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 120, height: 6, background: "#1E2028", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${overallProgress}%`, height: "100%", background: overallProgress >= 70 ? "#45B69C" : overallProgress >= 40 ? "#F0C808" : "#E85D3A", borderRadius: 3, transition: "width .5s" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: overallProgress >= 70 ? "#45B69C" : overallProgress >= 40 ? "#F0C808" : "#E85D3A" }}>{overallProgress}%</span>
          </div>
        </div>
      </div>

      {/* Axis OKRs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {okr.axes.map((axisOkr, axisIdx) => {
          const axisProgress = axisOkr.keyResults.length > 0 ? Math.round(axisOkr.keyResults.reduce((s, kr) => s + Math.min(100, (kr.current / kr.target) * 100), 0) / axisOkr.keyResults.length) : 0;
          const color = getAxisColor(axisOkr.axis);

          return (
            <div key={axisOkr.axis} className="card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span className="axis-tag" style={{ background: color + "20", color }}>{getAxisIcon(axisOkr.axis)} {AXES.find((a) => a.id === axisOkr.axis)?.label}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{axisOkr.objective}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 80, height: 6, background: "#1E2028", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${axisProgress}%`, height: "100%", background: color, borderRadius: 3, transition: "width .5s" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{axisProgress}%</span>
                </div>
              </div>

              {axisOkr.keyResults.map((kr, krIdx) => {
                const pct = Math.min(100, Math.round((kr.current / kr.target) * 100));
                return (
                  <div key={kr.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid #1E2028", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <input className="input" style={{ background: "transparent", border: "none", padding: 0, fontSize: 13, color: "#ccc" }} value={kr.text} onChange={(e) => updateKR(axisIdx, krIdx, "text", e.target.value)} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <input className="input" type="number" style={{ width: 50, textAlign: "center", fontSize: 13, fontWeight: 700 }} value={kr.current} onChange={(e) => updateKR(axisIdx, krIdx, "current", e.target.value)} />
                      <span style={{ color: "#444", fontSize: 12 }}>/</span>
                      <input className="input" type="number" style={{ width: 50, textAlign: "center", fontSize: 13 }} value={kr.target} onChange={(e) => updateKR(axisIdx, krIdx, "target", e.target.value)} />
                      <input className="input" style={{ width: 36, textAlign: "center", fontSize: 11, color: "#666" }} value={kr.unit} onChange={(e) => updateKR(axisIdx, krIdx, "unit", e.target.value)} />
                    </div>
                    <div style={{ width: 60, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <div style={{ width: 36, height: 4, background: "#1E2028", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#45B69C" : color, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: pct >= 100 ? "#45B69C" : "#888", fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <button className="btn" style={{ fontSize: 10, padding: "2px 6px", color: "#666" }} onClick={() => removeKR(axisIdx, krIdx)}>✕</button>
                  </div>
                );
              })}

              <button className="btn" onClick={() => addKR(axisIdx)} style={{ marginTop: 8, fontSize: 11, width: "100%" }}>+ Key Result 추가</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
