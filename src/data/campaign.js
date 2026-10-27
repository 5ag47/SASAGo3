export const MAJORS = { physics: '수학 · 물리', chemistry: '화학', biology: '생물', cs: '정보' };
export const TRAITS = {
  steady: { name: '꾸준한 탐구자', description: '수학 +8 · 집중력 +10', effects: { math: 8, focus: 10 } },
  social: { name: '사사의 인싸', description: '평판 +15 · 구술력 +10', effects: { reputation: 15, speech: 10 } },
  strong: { name: '체력 만렙', description: '건강 +20 · 스트레스 −10', effects: { hp: 20, stress: -10 } },
};
export const LABELS = { hp:'건강', focus:'집중력', reputation:'평판', stress:'스트레스', math:'수학', science:'과학 · 정보', writing:'서술력', speech:'구술력', csat:'수능' };
export const ACTIONS = {
  math: { name:'수학 심층', hint:'수학 +3 · 건강 −2 · 스트레스 +3', effects:{math:3,hp:-2,stress:3} },
  science: { name:'과학 · 정보 심층', hint:'과학 +3 · 건강 −2 · 스트레스 +3', effects:{science:3,hp:-2,stress:3} },
  rest: { name:'잠 · 휴식', hint:'건강 +9 · 스트레스 −9 · 집중력 +2', effects:{hp:9,stress:-9,focus:2} },
  exercise: { name:'운동', hint:'건강 +12 · 스트레스 −5', effects:{hp:12,stress:-5} },
  play: { name:'게임 · 친구와 놀기', hint:'스트레스 −15 · 평판 +1 · 집중력 −2', effects:{stress:-15,reputation:1,focus:-2} },
  clean: { name:'방 청소', hint:'이번 주 호실 점검 대비 · 평판 +1', effects:{reputation:1,stress:-2} },
  interview: { name:'연합스터디 · 모의면접', hint:'구술력 +4 · 서술력 +2 · 스트레스 +3', effects:{speech:4,writing:2,stress:3,hp:-2} },
  csat: { name:'수능 공부', hint:'담임 상담 후 해금 · 수능 +5', effects:{csat:5,stress:3,hp:-2} },
  academy: { name:'해냄 심층 수업', hint:'4,000원 · 수학 +5 · 스트레스 +4', cost:4000,effects:{math:5,stress:4,hp:-3} },
  work: { name:'주말 알바', hint:'8,000원 · 건강 −7 · 평판 −1', effects:{hp:-7,reputation:-1},income:8000 },
};
export const SHOP = [
  {id:'snack',name:'매점 간식',price:2500,description:'건강 +6 · 스트레스 −8',effects:{hp:6,stress:-8}},
  {id:'notes',name:'선배의 정리 노트',price:9000,description:'수학 +4 · 과학 +4',effects:{math:4,science:4}},
  {id:'outfit',name:'졸사 컨셉 의상',price:20000,description:'평판 +8 · 졸사 이벤트 보너스',effects:{reputation:8}},
];
export const UNIVERSITIES = {
  snu:{name:'서울대',threshold:80,competition:5,description:'학점·심층·면접 중심. 외부대회 미반영.'},
  kaist:{name:'KAIST',threshold:73,competition:4,description:'과학·면접·탐구 활동 중심.'},
  postech:{name:'POSTECH',threshold:70,competition:3,description:'학점·과학·외부대회 반영.'},
  korea:{name:'고려대',threshold:66,competition:3,description:'학점·서술력·면접 반영.'},
  csat:{name:'수능 전형',threshold:68,competition:4,description:'수능 능력치 중심. 모의면접은 반영하지 않음.'},
};
export const INTERVIEW = [
  {question:'처음 보는 문제에서 가장 먼저 할 일은?',options:['조건과 가정을 정리하고 접근법을 설명한다','정답부터 추측한다','외운 풀이를 그대로 말한다'],answer:0},
  {question:'실험 결과가 예상과 다르다. 어떻게 설명할까?',options:['오차가 있으니 결과를 버린다','측정 오차와 가설을 구분하고 재검증을 제안한다','예상한 결과로 고친다'],answer:1},
  {question:'팀 프로젝트에서 맡은 역할을 설명해 보자.',options:['팀이 전부 해줬다고 말한다','수상 실적만 나열한다','기여한 부분과 실패에서 배운 점을 구체적으로 말한다'],answer:2},
];
// 초안의 선택형 사건. 선택 결과는 게임 내 규칙이며 실제 입시 기준이 아니다.
export const EVENTS = [
  {id:'study',week:0,title:'스터디 인원 모집하기',text:'새 학년, 누구와 함께 공부할까? 열공팀은 평판이 높을수록 합류 확률이 올라가요. 거절되면 다른 팀을 고를 수 있어요.',choices:[{label:'찐친들 스터디',kind:'friends',detail:'100% 합류 · 2주마다 스트레스 −8'},{label:'안 친하지만 열심히 하는 스터디',kind:'serious',detail:'합류 55~95% · 매주 과제, 완료 시 수학 +4'},{label:'노는 스터디',kind:'play',detail:'100% 합류 · 매주 스트레스 −5, 집중력 −1'},{label:'혼자 공부하기',kind:'solo',detail:'스터디 없이 내 일정에 집중'}]},
  {id:'thesis',week:1,title:'졸업논문 준비를 시작해야 합니다',text:'6월 마지막 주까지 졸논을 완성하세요. 알림을 확인하면 할 일에 추가됩니다.',task:{id:'thesis',name:'졸업논문',target:12,due:16,reward:{writing:8,reputation:6}}},
  {id:'festival',week:9,title:'인예주, 무대와 입시 사이',text:'행사도 추억이고 공부도 중요하다. 이번 주엔 무엇을 챙길까?',choices:[{label:'행사 참여',effects:{stress:-18,reputation:6,hp:-5}},{label:'입시에 집중',effects:{math:5,stress:8}}]},
  {id:'lecture',week:10,title:'입시설명회와 선배 강연',text:'나침반 같은 조언. 강연을 들으면 이번 주 자습 두 칸을 사용합니다.',choices:[{label:'강연 듣기 · 2칸',kind:'lecture',effects:{speech:4,stress:-8}},{label:'자습하기',effects:{stress:4}}]},
  {id:'photo',week:11,title:'졸업사진 컨셉 정하기',text:'기숙사에서 웃던 날도 사진에 남겨두자. 매점에서 산 의상이 있다면 평판 보너스!',choices:[{label:'친구들과 컨셉 사진',kind:'photo',effects:{reputation:3,stress:-6}},{label:'단정한 교복 사진',effects:{focus:3}}]},
  {id:'jeju',week:12,title:'생다이, 제주도로!',text:'바람과 바다, 그리고 밀린 관찰 기록. 잠깐 학교 밖으로 나가자.',choices:[{label:'제주도 탐방',effects:{stress:-20,hp:-10,science:4}},{label:'학교에 남아 자습',effects:{math:4,stress:5}}]},
  {id:'teacher',week:13,title:'추천서를 부탁할 선생님',text:'상담과 과제에서 쌓은 신뢰가 추천서의 바탕이 됩니다.',choices:[{label:'전공 선생님께 부탁하기',kind:'recommend',effects:{stress:3}},{label:'담임 선생님과 상담하기',kind:'counsel',effects:{stress:-5}}]},
  {id:'reflection',week:16,title:'학기말 소감문',text:'기말이 끝나도 제출은 잊지 말기. 이번 주 안에 한 칸을 배정하세요.',task:{id:'reflection',name:'학기말 소감문',target:1,due:16,reward:{reputation:3,writing:2}}},
  {id:'counsel',week:17,title:'여름방학 진학 상담',text:'3-1 성적을 돌아보며 나에게 맞는 길을 찾아보자. 상담하면 수능 공부와 수능 전형이 열립니다.',choices:[{label:'선생님과 상담하기',kind:'counsel',effects:{stress:-8}},{label:'수시 준비에 집중',effects:{writing:4}}]},
  {id:'summer',week:17,title:'여름방학 공부 장소',text:'방학 동안 공부 효율과 생활비가 달라집니다. 비용은 공부하는 자습 한 칸마다 지불합니다.',choices:[{label:'관리형 스카 · 칸당 1,500원',kind:'managed',detail:'학습 1.4배 · 스트레스 추가 +1'},{label:'스터디카페 · 칸당 700원',kind:'cafe',detail:'학습 1.2배'},{label:'집',kind:'home',detail:'학습 0.9배 · 매주 용돈 추가 3,000원'}]},
  {id:'room',week:21,title:'방 배정 뽑기',text:'새 호실은 과연 조용할까? 운에 맡겨야 하는 기숙사 생활.',choices:[{label:'방 배정표 열기',kind:'room'}]},
  {id:'contest',week:22,title:'외부대회 도전',text:'두 칸을 투자해 탐구를 발표합니다. 과학 능력치가 높을수록 수상 확률이 높아요.',choices:[{label:'대회 참가 · 2칸',kind:'contest',effects:{stress:5}},{label:'자소서 준비',effects:{writing:4}}]},
  {id:'essay',week:25,title:'9월, 원서의 계절',text:'진학실에서 목표 대학과 학과를 고르고 원서를 접수하세요. 자소서는 9월 마지막 주까지 완성해야 합니다.',task:{id:'essay',name:'자기소개서',target:8,due:28,reward:{writing:10,reputation:3}}},
  {id:'rival',week:26,title:'진학실에 도는 소문',text:'학점 높은 친구가 같은 학과에 지원한다는 소문. 평판이 높으면 정확한 경쟁 정보를 확인할 수 있어요.',choices:[{label:'내 페이스 지키기',effects:{stress:5,focus:3}},{label:'친구에게 정보 물어보기',kind:'rival',effects:{hp:-3}}]},
  {id:'chuseok',week:28,title:'추석 연휴',text:'특강을 들을까, 오랜만에 푹 쉴까?',choices:[{label:'추석특강 · 8,000원',cost:8000,effects:{math:8,writing:4,stress:8}},{label:'가족과 쉬기',effects:{hp:12,stress:-15}}]},
  {id:'creative',week:30,title:'창의도전 결과 발표',text:'3-1 만점이면 합격, 그 외에는 학점에 비례한 확률로 평가합니다.',choices:[{label:'결과 확인',kind:'creative'}]},
  {id:'interview',week:34,title:'설카포 면접 연습장',text:'답을 고르는 3문항 미니게임. 면접 점수는 수시 결과에만 반영됩니다.',kind:'interview'},
  {id:'birthday',week:7,title:'기숙사에서 맞는 생일',text:'친구들이 방문을 두드린다. 평판에 따라 생일의 풍경이 달라집니다.',choices:[{label:'문 열기',kind:'birthday'}]},
];
