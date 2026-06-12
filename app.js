/* サプリ摂取トラッカー — ローカル完結・記録専用アプリ
 * データは IndexedDB（端末内）に保存。サーバー送信なし・アカウント不要。
 * 医療的な推奨/警告ロジックは持たない（純粋な記録ツール）。 */
'use strict';

/* ============================================================
 * シードデータ（§3.2）
 * ============================================================ */
const SEED = {
  scheduleVersion: '2026-06-12',
  blocks: [
    { id: 'morning',   label: '朝',         context: '断食。コーヒー＋MCTと',     color: '#bd8a2c' },
    { id: 'lunch',     label: '昼',         context: 'ランチ＝メイン食',          color: '#4f6f52' },
    { id: 'afternoon', label: '午後',       context: 'コーヒー2杯目（〜14時台）',  color: '#8a5a3c' },
    { id: 'evening',   label: '夕方',       context: '補食',                      color: '#b5562f' },
    { id: 'night',     label: '夜',         context: '食べない or 0.5食',        color: '#3f4f7a' },
    { id: 'bedtime',   label: '寝る前',     context: '',                         color: '#6e3f5f' },
    { id: 'running',   label: 'ランニング後', context: '走った日だけ',              color: '#2e7d6b' }
  ],
  items: [
    // 朝
    { id: 'morning_citrate',      block: 'morning',   name: 'クエン酸',                          dose: '3粒',     doseNote: '470mg/粒・水と一緒に',                  badge: 'コーヒーと', optional: false },
    { id: 'morning_mct',          block: 'morning',   name: 'MCTオイル',                         dose: '小さじ1', doseNote: 'C8/C10・ケトン供給',                    badge: 'コーヒーに', optional: false },
    { id: 'morning_b_complex',    block: 'morning',   name: 'Basic B Complex（活性型）',          dose: '2粒',     doseNote: 'メチル葉酸・メチルB12・B2計20mg',        badge: 'コーヒーと', optional: false },
    { id: 'morning_b12',          block: 'morning',   name: 'メチルコバラミンB12',                dose: '1粒',     doseNote: '500mcg',                                badge: 'コーヒーと', optional: false },
    { id: 'morning_probiotic',    block: 'morning',   name: 'UltraFlora Control（B420）',         dose: '1粒',     doseNote: '10億CFU・ディスバイオシス手当て',          badge: '空腹OK',     optional: true  },
    { id: 'morning_chlorella',    block: 'morning',   name: 'クロレラ',                          dose: '5粒',     doseNote: 'カビ毒の予防的吸着（B12は数えない）',      badge: 'コーヒーと', optional: true  },
    // 昼
    { id: 'lunch_enzyme',         block: 'lunch',     name: '消化酵素（Thorne）',                 dose: '2カプセル', doseNote: 'ベタインHCl・牛胆汁含む',              badge: '食べ始め', optional: false },
    { id: 'lunch_solaray',        block: 'lunch',     name: 'Solaray Calcium Citrate Plus',     dose: '2粒',     doseNote: 'Ca/Mg/Zn/銅/D/B6複合',                  badge: '食事と',   optional: false },
    { id: 'lunch_d3',             block: 'lunch',     name: 'ビタミンD3',                        dose: '1粒',     doseNote: '10,000IU・週4回想定',                   badge: '食事と',   optional: true  },
    { id: 'lunch_omega3',         block: 'lunch',     name: 'オメガ3（魚油）',                    dose: '3粒',     doseNote: 'EPA+DHA 約2,250mg',                    badge: '食事と',   optional: false },
    { id: 'lunch_stage7',         block: 'lunch',     name: 'STAGE7（アムラ・ウコン等）',         dose: '2粒',     doseNote: '抗酸化・ウコンは脂と吸収UP',             badge: '食事と',   optional: true  },
    { id: 'lunch_juice',          block: 'lunch',     name: '人参ジュース',                       dose: '1杯',     badge: '食後',                                                                              optional: true  },
    // 午後
    { id: 'afternoon_citrate',    block: 'afternoon', name: 'クエン酸',                          dose: '2粒',     doseNote: '470mg/粒・水と一緒に',                  badge: 'コーヒーと', optional: false },
    // 夕方
    { id: 'evening_solaray',      block: 'evening',   name: 'Solaray Calcium Citrate Plus',     dose: '1粒',     doseNote: '複合',                                  badge: '食事と',   optional: false },
    { id: 'evening_enzyme',       block: 'evening',   name: '消化酵素（Thorne）',                 dose: '2カプセル', doseNote: '固形のとき',                          badge: '食事と',   optional: true  },
    // 夜
    { id: 'night_enzyme',         block: 'night',     name: '消化酵素（Thorne）',                 dose: '2カプセル', doseNote: '食べる日だけ',                        badge: '食事と',   optional: true  },
    // 寝る前
    { id: 'bedtime_magnesium',    block: 'bedtime',   name: 'マグネシウム（Thorne CitraMate）',   dose: '1粒',     doseNote: '元素Mg 135mg・クエン酸+リンゴ酸',        badge: '空腹OK',   optional: false },
    { id: 'topical_magrelief',    block: 'bedtime',   name: 'Mag Relief ローション（外用）',       dose: '2〜4プッシュ', doseNote: '入浴後/ストレッチ後・ふくらはぎ/足裏/肩/首', badge: '外用',     optional: true  },
    // ランニング後（runOnly:true — isRunDay=true の日だけ表示・分母にも入る）
    { id: 'run_magnesium',        block: 'running',   name: 'マグネシウム（Thorne CitraMate）追加分', dose: '1粒',       doseNote: '寝る前1粒と合わせ計2粒体制・発汗でのMg喪失/筋回復', badge: '空腹OK', optional: false, runOnly: true },
    { id: 'run_electrolyte',      block: 'running',   name: '電解質（沖縄天然塩）',                  dose: '水500mlに塩ひとつまみ', doseNote: '発汗での電解質喪失の補給',         badge: '空腹OK', optional: false, runOnly: true },
    { id: 'run_magrelief',        block: 'running',   name: 'Mag Relief ローション（外用・ラン後）', dose: '2〜4プッシュ', doseNote: '経皮Mg・局所の筋回復（ふくらはぎ/足裏）',     badge: '外用',     optional: true,  runOnly: true }
  ]
};

/* ============================================================
 * 各サプリの「解説」テンプレ（別Chatに見せて埋めてもらう土台）
 * 編集モード未入力の項目はこのテンプレが初期表示される
 * ============================================================ */
const ITEM_NOTE_TEMPLATE = `## なぜ飲むか
（このサプリを摂取する目的・体や目標との関係をここに記載）

## なぜ自分に効くのか（検査）
（自分の検査値・体質との関係）

## 体の中で何が起きるか
（作用メカニズム・経路）

## 留意点・相互作用
（タイミングの根拠・他サプリとの相互作用・過剰摂取リスク・禁忌）

## 出典
（参考文献・URL）
`;

/* ============================================================
 * SEED_NOTES：各サプリのプリ書き解説。
 * 初回ロード時に itemNotes が空の項目だけマージする（ユーザー編集は上書きしない）。
 * バージョン管理で再走を防止。新しい解説を追加するときは SEED_NOTES_VERSION を上げる。
 * ============================================================ */
const SEED_NOTES_VERSION = '2026-06-09b';
const SEED_NOTES = {
  morning_b_complex: `## なぜ飲むか
朝の自分へ。これは「頭と代謝のエンジンに、ちゃんと使える形の燃料を入れる」2粒。自分は生まれつき、集中やひらめきを生む脳内物質を片付けるのに「メチル」という潤滑油を人より食う体質（COMT-Worrier）。さらに検査で、エンジンの要であるB2が足りていないサインが出ている。普通のビタミンB剤じゃなく"活性型（メチル化済み）"を選んでいるのは、自分のタイプだと合成葉酸はむしろ邪魔になりうるから。これを飲むと、頭の回転・気分の安定・代謝の土台がじわっと底上げされるはず。「最近なんか冴えない・だるい」が続くなら、まずここが効いてるか疑う場所。

## なぜ自分に効くのか（検査）
OATでB2欠乏のサイン（グルタル酸0.58H）、ドーパミン代謝物の高値＝メチルを食ってる証拠（DOPAC高・2-ヒドロキシ酪酸2.2H）。DNAもCOMT-Worrier＋B6を多く要る、と出ている。これも流行りじゃなく、自分のデータが「活性型のBを要る」と名指ししている。

## 体の中で何が起きるか
このBは全部"活性型"で入っている——B2は最初からFMNの形（Riboflavin 5'-Phosphate＝R5P）、葉酸はメチル型(L-5-MTHF)、B12もメチルコバラミン、B6もP5P。だから自分のように変換が苦手なタイプでも、変換の手間なしでそのまま使える。中でもB2は、代謝を回す機械（電子伝達系・グルタチオン還元・MTHFR）を支える"土台"として効く。ここで誤解しないように——B2は「甲状腺ホルモンを使う側の代謝機械を活かす足場」であって、FT3そのものを直接押し上げるわけではない。自分のFT3が低い理由が橋本（自己免疫＝原発）なら、B2をどれだけ足しても甲状腺自体は上がらない。だから"甲状腺が上向く"は期待に入れず、抗体検査の結果が出るまで保留。B2に期待するのは、あくまで脳の潤滑油ラインとエネルギー工場の底上げ。

## 留意点・相互作用
朝だけ（夜に飲むと覚醒方向で眠れなくなる）。水溶性で余りは尿に出る＝尿が黄色くなるのは無害。まず1粒で様子見、高揚しすぎ・寝つき悪化・胃の感じが無ければ2粒へ。2粒でB2 20mg・葉酸1,334mcg DFE・B12 800mcg・ナイアシン280mg（うちナイアシンアミド260mg・フラッシュは出にくい）。1点だけ正直に——このナイアシンアミドも体内でメチルを少し消費するので、COMT-Worrierで「メチルを節約したい」自分の方針とは厳密には同じ向きの軽い負荷。量が小さいので問題にはしないが、ナイアシン単体を別に足すのは避ける（だから除外品にしている）。

## 出典
OAT（グルタル酸・DOPAC・2-ヒドロキシ酪酸）／DNA（COMT-Worrier・B6）／血液（FT3時系列・TSH）／製品ラベル（全成分活性型・ナイアシン140mg/粒）／資料「メチレーションと脳機能分類」「副腎疲労と甲状腺機能低下（甲状腺とVB2の関係・甲状腺機能低下の2パターン表）」「ミトコンドリアの基礎」。
`,
  morning_b12: `## なぜ飲むか
朝の自分へ。これは「活性型B12を、念のため上乗せしておく」在庫消費の1粒。本当の土台は朝のBasic B（こっちにメチルB12が800mcg入っていて、しかも継続的に手に入る）。この単体B12は、それでも自分は胃が弱くてB12の吸収口が狭いから、手持ちがある間は"確実性の保険"として足しておく、という位置づけ。無くなったら買い足さなくていい——Basic Bがあれば土台は崩れない。飲み忘れても気にしないでいい枠。

## なぜ自分に効くのか（検査）
GI-MAPでピロリ菌陽性＝胃酸低め＝B12の吸収口が半分閉まっている。だから「Basic Bのぶんだけだと吸収が不安」という時に、もう一押し確実性を足せる。ただし機能的には今のB12は足りている（OATメチルマロン酸は正常）ので、これは"足りないから飲む"ではなく"確実にしておく保険"。

## 体の中で何が起きるか
メチルコバラミンはメチオニン回路を回してメチル供与体(SAMe)を作る流れを支える、そのまま使える活性型。胃酸が低くても一部は受動的に吸われるので、複数ソース（Basic B＋単体）で入れておくと吸収の取りこぼしを減らせる。

## 留意点・相互作用
朝・食前。水溶性で過剰は尿に出る＝安全。Basic Bと重複するが害なし（むしろ確実性が上がる）。任意・在庫消費：手持ちが切れたら補充不要、Basic Bに一本化してよい。

## 出典
GI-MAP（ピロリ）／OAT（メチルマロン酸）／Basic Bラベル（メチルB12 400mcg/粒）／資料「メチレーションと脳機能分類」「血液データの読み方（胃酸・内因子・B12吸収・回腸末端）」。
`,
  lunch_omega3: `## なぜ飲むか
昼の自分へ。これは「体のあらゆる細胞の"膜"を、しなやかな良い油で作り直す」ための3粒。自分は生まれつきオメガ3を人より要るタイプで、腸にも軽い火種があり、関節も傷めやすい傾向。膜が硬い油で出来ていると、炎症・インスリンの効き・関節すべてに響く。これを飲むと、炎症がくすぶりにくい体・関節の調子・頭の回転（脳は油の塊）に、じわっと効いてくるはず。即効性のサプリではなく、数ヶ月かけて「土台の油を入れ替える」もの。

## なぜ自分に効くのか（検査）
DNAでオメガ3 Higher Needs・ケガのリスク高め。GI-MAPで活動性の炎症はないけど"火種"あり（悪玉菌やや高・善玉やや低）。OATで酸化ストレス高め。膜と炎症のバランスにダイレクトに効く場所。

## 体の中で何が起きるか
EPA/DHAは細胞膜に組み込まれて膜をしなやかに保ち、炎症を鎮める側の材料になる（炒め物の油などn-6過多の炎症傾向を打ち消す）。ただし長鎖の油なので、吸収には"胆汁"が要る＝脂とタンパクの入った食事と一緒でないと吸われない。

## 留意点・相互作用
昼のメイン食に3粒まとめる（胆汁が出る＋Thorne酵素の牛胆汁で吸収が立つ）。朝コーヒー＋MCTでは吸収の足場にならない（MCTは門脈直行の別ルートを通るので油の足場にならない）。魚油カプセルは精製油なので魚のヒスタミン問題はほぼ無し。血が固まりにくくなるので、もし抗血小板薬を使う場面では一言伝える。

## 出典
DNA（オメガ3 Higher Needs・Injury Risk）／GI-MAP／OAT／資料「脂質の基礎（消化吸収・ミセル→カイロミクロン→リンパ管）」。
`,
  lunch_d3: `## なぜ飲むか
昼の自分へ。これは「食べたカルシウムを、骨にちゃんと入れる現場監督」を雇う1粒。自分は生まれつきDを人より要るうえに骨密度が低め傾向で、しかも分子栄養の先生に「お前は吸収が体質的に悪いから多めでいい、むしろ摂れ」と言われている。だから成人基準の約1.5倍を狙う。これが効いていると、骨の貯金・気分・免疫の土台が支えられる。太陽に当たっていても自分は作りが弱いタイプなので、ここはサボらない。

## なぜ自分に効くのか（検査）
DNAでD Higher Needs・骨密度低めの予測。血液でALPやや高め(204)＝骨が回転している可能性。高シュウ酸がCa/Mgを奪う体質なので、Caを骨へ向かわせるDの監督役がより重要。

## 体の中で何が起きるか
D3は腸でのCa吸収を上げ、骨へのCa取り込みを支える監督。脂溶性なので脂のある食事と。多すぎると逆にCaが血や腎に余って結石・石灰化に傾くので、量は欲張らず管理する。

## 留意点・相互作用
昼のメイン食と。1粒10,000IUは強いので週4回（平均約5,700IU/日）にして1.5倍に着地、毎日は飲まない。高シュウ酸＋低BMDなのでCa×無機リン・ALPと併せて見る（後述Solarayと共通のゲート）。落ち着いたら25(OH)Dを一度測って、先生の「吸収悪い」も数字で答え合わせするのが理想。

## 出典
DNA（D Higher Needs・BMD）／血液（ALP）／分子栄養の先生の指示／資料「血液データの読み方（25(OH)D・Ca代謝）」。
`,
  bedtime_magnesium: `## なぜ飲むか
寝る前の自分へ。これは「夜ちゃんと休める体に戻す」1粒。自分はMgが慢性的に足りていなくて（血液で2.0まで落ちた）、しかもチョコ・コーヒー・お茶のシュウ酸がせっかくのMgを横取りする体質。Mgが足りないと、夜に神経が静まらない・足が攣る・眠りが浅い、が起きやすい。これを飲むと筋肉と神経が「緩む」側に傾いて、寝つき・眠りの深さ・朝のだるさが変わってくるはず。飲み忘れた翌朝に「なんか今日重いな」と感じたら、それがこの1粒の答え合わせ。

## なぜ自分に効くのか（検査）
血液Mg 2.0＝足りていない。毛髪では高いのに血で低い「奪われている」パターン＝OATのシュウ酸212が犯人。DNAも「自分はMgを人より要る」と出ている。自分のデータが名指しで「Mg要る」と言っている。

## 体の中で何が起きるか
Mgは筋肉と神経を「緩める」ミネラル（Caが縮める、Mgが緩める、のペア）。足りないと縮みっぱなしで攣り・こり・寝つきの悪さになる。主役はこのMg本体。製品にはおまけでクエン酸（Mgを奪っていたシュウ酸を尿で流す方向に働く）とリンゴ酸が付いているが、リンゴ酸を「エネルギー工場の燃料」と当てにしすぎない——自分のOATはエネルギー工場が"渋滞（出口の停滞）"しているタイプで、そこは燃料を足すより潤滑油（B2・CoQ10側）の問題だから。あくまでMgが主目的、クエン酸・リンゴ酸はおまけ、という距離感。

## 留意点・相互作用
寝る前1粒（元素Mg135mg）、空腹でOK。お腹が緩くなりにくい優しい型（クエン酸+リンゴ酸）。昼のSolarayにもMgが入っているので合計で適量（約269mg/日）、増やしすぎない。緩くなったら減らす。

## 出典
血液(Mg)／毛髪(Mg)／OAT(シュウ酸・クレブス中間体)／DNA(Mg Higher Needs)／製品ラベル／資料「ミトコンドリアの基礎」「こっそり帳（クエン酸回路）」「メチレーションと脳機能分類（COMTとMg）」。
`,
  lunch_solaray: `## なぜ飲むか
昼の自分へ。これは「カルシウムを単体でドカっと足す」ものではない——もしそれをやると、自分の体ではMgまで一緒に出ていってカルシウム代謝がむしろ崩れる（資料がはっきり言っている）。だからこれは「胃酸が低くても溶けるクエン酸カルシウムに、Mg・亜鉛・銅・微量元素を合わせた"複合ミネラルの軸"」として飲む。骨を直接強くする薬ではなく、ミネラルを面で揃えて他の単体サプリを足さずに済ませるための土台。

## なぜ自分に効くのか（検査）
胃酸低め（ピロリ）だから、溶けにくい炭酸カルシウムより溶けやすいクエン酸型が向く。亜鉛は血中101で足りているので、銅とセットの少量で十分。ただし注意——自分はALP204（骨の回転が速い＝カルシウムパラドックスの可能性）。資料の立場では「Ca単体補給はMgを奪って逆効果、Mg補給の方がよい」なので、これを"Ca狙い"で増やすのは違う。あくまでMg・微量元素込みの複合として、控えめに使う。

## 体の中で何が起きるか
クエン酸カルシウムは胃酸が低くても溶けやすく、腸でCaがシュウ酸を捕まえて「シュウ酸の吸収・結石化」を防ぐ（朝のクエン酸カプセルが"尿で流す"のに対し、こっちは"腸で直接捕まえる"係。役割が違う）。Mg/Zn/銅/ホウ素/シリカが脇を固める。

## 留意点・相互作用
昼2粒＋夕方1粒＝1日3粒、食事と。単体亜鉛は足さない（合計が上限に寄るのを避ける）。folic acidが微量入るが、活性型Bを朝に摂っているので気にしない。継続のゲート：Ca×無機リン（資料で≥30はCa代謝異常の疑い）とALPを次の血液で確認し、Ca代謝が崩れる方向に出ていないかを見る。崩れ気味なら量を減らすかMg優先に切り替える。

## 出典
血液（BMD・ALP・Ca×無機リン）／OAT（シュウ酸）／血中Zn・銅／製品ラベル／資料「血液検査データの読み方eBOOK（カルシウムパラドックス・Mg優先）」。
`,
  morning_citrate: `## なぜ飲むか
コーヒーと一緒に飲む自分へ。これは「コーヒーのシュウ酸から、自分のミネラルと腎臓を守る盾」。自分はシュウ酸が基準の3倍たまる体質で、シュウ酸はCa・Mg・亜鉛を横取りして関節や腎に溜まる。コーヒーはそのシュウ酸源。クエン酸を一緒に入れておくと、尿をアルカリ側に傾けてシュウ酸が石になるのを防ぎ、ついでに低い胃酸を補ってミネラルの吸収も助ける。毎日のコーヒー習慣に対する、地味だけど理にかなった保険。

## なぜ自分に効くのか（検査）
OATでシュウ酸212（基準の3倍）。胃酸低め（ピロリ）。毛髪・血液でMgが奪われているパターン。シュウ酸を抑えればMgも守れる、という一本の線。

## 体の中で何が起きるか
このクエン酸（カプセル＝クエン酸そのもの）は、尿をアルカリ化してカルシウムシュウ酸が結晶化するのを抑える働きと、胃を軽く酸性に保ってミネラルを溶けやすくする働きの二役。※腸内でシュウ酸を直接捕まえる役は、昼のSolaray（クエン酸"カルシウム"）が担当。役割が違うので両方ある。

## 留意点・相互作用
コーヒーと一緒に水で飲む（朝3粒・午後2粒＝1日5粒）。空腹に先飲み・大量だと胃が荒れた実績があるので、必ずコーヒーと一緒・少量から。カプセルなので歯に酸が触れる心配はない。

## 出典
OAT（シュウ酸）／血液・毛髪（Mg）／GI-MAP（胃酸）／資料「ミトコンドリアの基礎（クエン酸回路）」。※「尿アルカリ化によるシュウ酸結石の予防」は標準的な腎臓内科の一般知見（プロジェクト資料の記載ではない）。
`,
  lunch_enzyme: `## なぜ飲むか
食事の自分へ。これは「自分の弱った胃酸を外から補って、食べたものをちゃんと分解・吸収する」ための助っ人。自分は胃に居候（ピロリ菌）がいて胃酸が低め＝タンパクやミネラル、B12の分解・吸収が落ちている。この酵素にはベタインHCl（胃酸の素）と牛胆汁（脂を吸うのに必要）が入っているので、低い胃酸と胆汁を両方補える。これが効いていると、食後の重さが減り、せっかく食べたタンパク・サプリがちゃんと身になる。

## なぜ自分に効くのか（検査）
GI-MAPでピロリ菌陽性＝胃酸低め。胃酸が低いと「ペプシンが働かない→タンパク分解↓」「ミネラル・B12吸収↓」が起きる。まさにその入口を補う。牛胆汁は、昼に摂るオメガ3・D3（脂溶性）の吸収の足場にもなる。

## 体の中で何が起きるか
ベタインHClが胃を適切な酸性にしてペプシンを働かせ、パンクレアチンが三大栄養素を分解、牛胆汁が脂を乳化して脂溶性ビタミンとオメガ3の吸収を助ける。

## 留意点・相互作用
固形の食事のときだけ（朝のジュース・断食には不要）。昼が本命（サプリを一番載せる食事＝吸収を底上げ）。ラベルに胃潰瘍は禁忌とあるので、もし胃潰瘍が出たら中止。

## 出典
GI-MAP（ピロリ・胃酸）／製品ラベル／資料「たんぱく質の基礎」「血液データの読み方（胃酸→ペプシン）」。
`,
  morning_mct: `## なぜ飲むか
朝の自分へ。これは「朝もたつくエンジンに、すぐ燃える燃料を一滴さす」ためのオイル。自分は朝の立ち上がりが弱く（朝のコルチゾールが弱い＝CARが低い）、午前に軽い低血糖の谷ができやすい。MCTは砂糖と違って血糖を上げずに、すぐ脳と体が使えるケトンに変わる。だから16時間断食を崩さずに、朝の谷とぼんやりを埋められる。コーヒーに混ぜて、断食したまま頭だけ先に起こすイメージ。

## なぜ自分に効くのか（検査）
コルチゾール検査で朝のCARが弱い＝朝の点火がもたつく体質。CGMでも、血糖の波を制圧した後に「朝の軽い低血糖」が素顔として残っているのが見えた。OATでケトン体が高め＝もともと脂を燃やせる体なので、MCTのケトン供給と相性が良い。

## 体の中で何が起きるか
MCT（中鎖脂肪酸）は、普通の脂と違って門脈から直接肝臓へ行き、すぐケトンになる（長鎖より4倍速く、カルニチン不要）。だから血糖を上げずに脳のすぐ使える燃料になる。ここがポイントで、この「直行ルート」ゆえに、オメガ3やD3のような脂溶性のものを運ぶ"足場"にはならない（だからオメガ3は朝に乗せず昼に集約している）。

## 留意点・相互作用
朝コーヒーに小さじ1から。いきなり多いとお腹が緩む（慣れたら小さじ2まで）。ペナンは暑いので酸化を避けて涼しい所に保管。

## 出典
コルチゾール（CAR）／CGM（朝の低血糖）／OAT（ケトン体）／資料「脂質の基礎（MCT・中鎖脂肪酸＝門脈直行・カイロミクロン非形成）」。
`,
  morning_probiotic: `## なぜ飲むか
朝の自分へ。これは「腸の"火種"が燃え広がらないよう、消防士の善玉菌を足しておく」1粒。自分の腸は、大きな炎症は無いものの、悪玉寄りの菌がやや増え、腸を守る善玉菌（粘液層を作る菌・炎症を鎮める菌）がやや手薄。その隙間を埋める菌で、しかもB420は代謝・体重まわりの研究もある株。血糖を整えた今の流れとも噛み合う。劇的な体感より、「腸が静かで、体全体の炎症がくすぶりにくい土台」を維持するための1粒。

## なぜ自分に効くのか（検査）
GI-MAPで、活動性の炎症は無い（カルプロテクチン61で正常）が、Klebsiella等の悪玉グラム陰性菌がやや高く、Akkermansia・Faecalibacterium（守りの善玉）がやや低め。血液CRPも以前の0.28から0.037まで下がって今は炎症が抑えられている（※このCRP値は自分のGI-MAP/血液の実測由来）＝この火種を抑え込んでおくのに良いタイミング。

## 体の中で何が起きるか
善玉菌を足すことで、悪玉菌の居場所を減らし、腸のバリアと炎症バランスを整える側に傾ける。B420は胃酸に強く、腸に届きやすい株。腸の炎症がくすぶると体全体・代謝にも響くので、入口で抑える。

## 留意点・相互作用
朝・空腹OK（胃酸に強い株なので食事問わず可）。昼はベタインHClで胃酸が強くなる枠なので、菌には朝の方が優しい。任意項目（毎日でなくても土台は崩れない）。

## 出典
GI-MAP（菌叢・カルプロテクチン）／血液（CRP時系列・本人実測）／製品ラベル／資料「腸の炎症・リーキーガット」。
`,
  lunch_stage7: `## なぜ飲むか
昼の自分へ。これは「体の中で出ている"煙"を消す、抗酸化のひと押し」。自分は生まれつき抗酸化の必要量が高く、検査でも実際に酸化ストレスとグルタチオン需要が高く出ている（＝エンジンが回ると煙が多めに出る体質）。アムラ・ウコンなどの植物ポリフェノールはその煙を抑える方向に働く。必須ではなく、抗酸化の底上げをしたい日の任意の一押し、という位置づけ。あと1.5袋で終わるので、在庫消費の枠。

## なぜ自分に効くのか（検査）
DNAで抗酸化Higher Needs。OATで酸化ストレス高め・グルタチオン需要↑（ピログルタミン酸・2-ヒドロキシ酪酸が高い）。だから抗酸化の補強は、自分の弱点にちゃんと合っている。

## 体の中で何が起きるか
アムラ・ウコン（クルクミン）・ターミナリアのポリフェノールが、活性酸素を抑える側に働く。ウコンは脂溶性で吸収が悪いので、脂のある食事と一緒だと吸収が上がる。

## 留意点・相互作用
昼の食事と（ウコンの吸収のため）。任意・在庫消費（1.5袋で終了、切れたら補充不要）。アムラはビタミンCを含むが、エキス末2粒では微量でシュウ酸の心配は無視できる範囲。

## 出典
DNA（抗酸化Higher Needs）／OAT（酸化ストレス・グルタチオン需要）／製品ラベル。
`,
  morning_chlorella: `## なぜ飲むか
朝の自分へ。これは「毎日のコーヒーと、沖縄の多湿な住環境から、じわじわ入ってくるカビ毒を、腸で捕まえて出す」習慣的な防衛の一手。コーヒーは構造的にカビ毒（オクラトキシンA等）のリスク食品で、しかもカビ毒は焙煎しても壊れず残る。自分はスペシャルティしか飲まないからリスクは下げているけど、オクラトキシンAは腎臓に長く居座る性質があるので「1杯は低リスクでも、毎日×長年で微量がたまる」と考えている。加えて住んでいる沖縄は高温多湿でカビが出やすい＝入口が常に開いている環境。だから「検査で出たから除去」ではなく、「曝露が常にあるから、習慣で掃除し続ける」という予防の位置づけ。重金属デトックスは（毛髪ゼロで）目的じゃない。

## なぜ自分に効くのか（検査・状況）
カビ毒そのものは測っていない＝これは実測ベースではなく「曝露習慣＋環境」ベースの予防。毎日のコーヒー（カビ毒リスク食品）と沖縄の多湿環境が、慢性的な曝露源として常在している、という状況判断が根拠。重金属は毛髪検査でゼロ＝金属デトックスの出番はない。確度を数字で上げたければ、いつかマイコトキシン尿検査で「実際にたまっているか」を答え合わせできる。

## 体の中で何が起きるか
クロレラの硬い細胞壁が、腸の中でカビ毒を吸着して便として排出する方向に働く。注意点として、この吸着はカビ毒だけを選ばず、脂溶性のもの（オメガ3・D3）も巻き込みうる。だから脂溶性サプリは昼に分けている。朝に一緒に摂るMCTも脂質だが、MCTは門脈直行で吸着の影響を受けにくいので、朝クロレラ＋MCTは大きな問題にならない。クロレラのB12はアナログ（人体での利用が当てにならない型）を含むので、B12源としては数えない。

## 留意点・相互作用
朝・コーヒーと（カビ毒を狙うならコーヒーと同じタイミングが理にかなう）。脂溶性サプリ（オメガ3・D3）とは時間をずらす＝今の朝/昼の配置でOK。在庫10袋・3000粒あり当面継続。任意（飲み忘れても土台は崩れない、習慣として続けることに意味がある枠）。

## 出典
コーヒーのカビ毒リスク（オクラトキシンA・焙煎で残存・腎毒性・長期滞留／カビ毒解説資料＋一般知見）／沖縄＝高温多湿の居住環境／毛髪（重金属ゼロ）／クロレラのマイコトキシン吸着に関する一般的報告（※本人のカビ毒実測なし＝曝露習慣・環境ベースの予防）。
`,
  lunch_juice: `## なぜ飲むか
昼食後の自分へ。これは石原式の流れで続けている、温め＆栄養（βカロテン）のための一杯。ただし正体は「繊維を抜いた糖の液体」なので、自分の糖質感受性からすると扱いに注意が要るもの。だから空腹に単体で流し込まず、ランチの"後"に置いている（血糖の急上昇を避けるため）。必須ではなく、飲みたい日の任意。カーボを絞っている時期は休んでもいい。ジュース屋が見つかった日だけ飲む、場所次第の一杯。

## なぜ自分に効くのか（検査）
CGMで自分は糖質感受性が高く食後スパイクが立ちやすいと実証済み。だから「空腹で液体の糖をガブ飲み」は自分にとって一番避けたい入り方。食後に回す・少量にする、で血糖の波を抑える。人参・リンゴ自体のシュウ酸は低めなので、その心配は小さい。

## 体の中で何が起きるか
βカロテンなどの栄養は摂れるが、繊維を抜いた汁は糖がゆっくり吸う仕組みを外した状態で入る。だから食後（既に食べた後）に飲むと、血糖の上がりが穏やかになる。

## 留意点・相互作用
ランチの食後に。任意・条件付き（ジュース屋が見つかった日だけ）。飲むなら量は控えめ。午前の断食中（空腹）には入れない。

## 出典
CGM（糖質感受性・食後スパイク）／石原式の食事リズム／資料「糖質の基礎」。
`,
  topical_magrelief: `## なぜ飲むか
こり・攣りの自分へ。これは飲むのではなく「肩こり・足の攣りに、皮膚から直接Mgを届ける」塗り薬的な一手。自分はMgが慢性的に足りず、Mg不足は筋肉が縮みっぱなしになる＝攣り・こりに直結する。寝る前のCitraMate(飲むMg)が"全身の底上げ＋睡眠"なら、こちらは"攣る・こる部位へのピンポイント投入"。役割が違うので両方使ってよい。夜のこむら返り予防や、肩が張った日に。

## なぜ自分に効くのか（検査）
血液Mg 2.0・高シュウ酸によるMg奪取＝筋が過剰収縮しやすい土台。冷え傾向（FT3低め）も攣りを後押し。だから局所にMgを足すのは理にかなう。

## 体の中で何が起きるか
塩化マグネシウムを皮膚から入れて、その部位の筋肉を緩める方向に働く（配合のMSMは関節・筋の張りをやわらげる方向）。経皮なので全身への吸収は限定的＝飲むMgと数字でぶつからない（だからMg1日合計には数えない）。

## 留意点・相互作用
入浴後やストレッチ後、ふくらはぎ・足裏・肩・首すじに2〜4プッシュ刷り込む。塗りたてにピリピリ・かゆみが出たら量を減らすか20〜30分後に流す（害ではなくMg特有の刺激）。任意・外用。攣りやすい日・運動した日だけでも十分。

## 出典
血液（Mg）／OAT（シュウ酸）／血液（FT3＝冷え傾向）／製品ラベル。
`
};
// 同一内容を共有する別itemId（クエン酸の午後分・酵素の夕方/夜分）
SEED_NOTES.afternoon_citrate = SEED_NOTES.morning_citrate;
SEED_NOTES.evening_enzyme = SEED_NOTES.lunch_enzyme;
SEED_NOTES.night_enzyme = SEED_NOTES.lunch_enzyme;
SEED_NOTES.evening_solaray = SEED_NOTES.lunch_solaray;

/* ============================================================
 * IndexedDB ラッパ
 *   meta: {key} … 'settings' / 'scheduleVersions' / 'currentVersion'
 *   logs: {date} … DailyLog
 * ============================================================ */
const DB_NAME = 'supplement-tracker';
const DB_VER = 1;
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'date' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(store, mode = 'readonly') { return _db.transaction(store, mode).objectStore(store); }
function idbGet(store, key) {
  return new Promise((res, rej) => { const r = tx(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function idbPut(store, val) {
  return new Promise((res, rej) => { const r = tx(store, 'readwrite').put(val); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function idbDelete(store, key) {
  return new Promise((res, rej) => { const r = tx(store, 'readwrite').delete(key); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}
function idbAll(store) {
  return new Promise((res, rej) => { const r = tx(store).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); });
}

/* ============================================================
 * 状態
 * ============================================================ */
const state = {
  settings: { dayBoundaryHour: 0, adhWindow: 30, mode: 'home' }, // mode: 'home' | 'travel'
  scheduleVersions: [],   // [{version, blocks, items}]  末尾が最新
  currentVersion: null,   // 最新バージョン文字列
  travelPack: null,       // string[] of itemIds in pack（旅行モードで表示する項目）。null=未初期化
  todayKey: null,
  calMonth: null,         // 履歴カレンダーの表示月（Date：1日）
  selectedDate: null,     // 履歴で選択中の日
  editDraft: null,        // 編集中のスケジュール（items 配列）
  packDraft: null,        // 編集中の持参リスト（itemId のSet風オブジェクト）
  itemNotes: {},          // {[itemId]: markdownString} 各サプリの解説本文
  detailItemId: null,     // 詳細ビューで現在開いている itemId
  detailReturnTo: 'today',// 詳細ビューを閉じたあとの戻り先 ('today' | 'history')
  detailEditing: false    // 詳細ビュー：編集モードか
};

/* ===== モード/持参リスト/ランニング ヘルパ ===== */
function currentMode() { return state.settings.mode || 'home'; }
function currentIsRunDayToday() { return !!(typeof todayLog !== 'undefined' && todayLog && todayLog.isRunDay === true); }

/** その日の "見える項目" を mode/pack/isRunDay で絞る共通フィルタ
 * - runOnly:true 項目は isRunDay=true の日だけ残す（分母にも入る）
 * - 走らない日は runOnly 項目が見えない＝連続記録が崩れない（旅行モードと同じ思想）
 */
function filterByModeAndPack(items, mode, packList, isRunDay) {
  let arr = items.filter(i => i.enabled !== false);
  // ラン日でなければ runOnly 項目を除外
  if (!isRunDay) arr = arr.filter(i => i.runOnly !== true);
  // 旅行モードは持参リストで絞る（runOnly項目もpackに入っていれば残る）
  if (mode !== 'travel') return arr;
  const pack = new Set(packList || []);
  return arr.filter(i => pack.has(i.id));
}
/** 今日の visible items（現在のmode/pack/isRunDay基準） */
function visibleItemsToday(sched) {
  return filterByModeAndPack(sched.items, currentMode(), state.travelPack, currentIsRunDayToday());
}
/** 過去日の visible items（その日のlogのmode/pack/isRunDay基準） */
function visibleItemsForLog(log, sched) {
  const mode = log.mode || 'home';
  const pack = mode === 'travel' ? (log.packList || state.travelPack || []) : null;
  return filterByModeAndPack(sched.items, mode, pack, log.isRunDay === true);
}

function currentSchedule() {
  return state.scheduleVersions.find(v => v.version === state.currentVersion) || state.scheduleVersions[state.scheduleVersions.length - 1] || SEED;
}
function scheduleByVersion(ver) {
  return state.scheduleVersions.find(v => v.version === ver) || currentSchedule();
}

/* ============================================================
 * 日付ユーティリティ
 * ============================================================ */
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/** 端末ローカル時刻＋境界時刻を考慮した「論理的な日付」キー */
function dayKeyOf(date, boundaryHour) {
  const shifted = new Date(date.getTime() - boundaryHour * 3600 * 1000);
  return ymd(shifted);
}
function todayKey() { return dayKeyOf(new Date(), state.settings.dayBoundaryHour); }
function parseKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
const WD = ['日', '月', '火', '水', '木', '金', '土'];
function fmtJP(key) { const d = parseKey(key); return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; }
function fmtJPFull(key) { const d = parseKey(key); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; }

/* ============================================================
 * ログ取得・保存
 * ============================================================ */
async function getLog(date) {
  return (await idbGet('logs', date)) || null;
}
/** その日のログを取得（なければ現行バージョンで初期化して返す。保存はしない） */
async function ensureLog(date) {
  let log = await getLog(date);
  if (!log) {
    log = { date, entries: {}, note: '', scheduleVersion: state.currentVersion, isRunDay: false };
    // 今日のログは生成時に現在のmode/packListをスタンプ
    if (date === todayKey()) {
      log.mode = currentMode();
      if (log.mode === 'travel') log.packList = [...(state.travelPack || [])];
    } else {
      log.mode = 'home'; // 過去日にログが無ければ home 扱い（完了率0%なので影響なし）
    }
  }
  if (!log.scheduleVersion) log.scheduleVersion = state.currentVersion;
  return log;
}
async function saveLog(log) {
  // 今日のログを保存するときは最新のmode/packListに更新（モード切替に即追従）
  if (log.date === todayKey()) {
    log.mode = currentMode();
    if (log.mode === 'travel') log.packList = [...(state.travelPack || [])];
    else delete log.packList;
  }
  // 空ログ（チェック0・メモ無し・ラン日でない）は保存しない＝記録が無い日はそのまま「未」
  const hasCheck = Object.values(log.entries || {}).some(e => e && e.checked);
  const hasNote = !!(log.note && log.note.trim());
  const hasRunDay = log.isRunDay === true;
  if (!hasCheck && !hasNote && !hasRunDay) {
    await idbDelete('logs', log.date);
    return;
  }
  await idbPut('logs', log);
}

/* ============================================================
 * 集計
 * ============================================================ */
function requiredItemsFor(sched) { return sched.items.filter(i => i.enabled !== false && !i.optional); }
/** その日のmode/packList/isRunDayで「必須として期待されている項目」を絞り込んで返す */
function requiredItemsForDay(log, sched) {
  let required = requiredItemsFor(sched);
  const isRun = log.isRunDay === true;
  // 走らない日は runOnly 必須項目を分母から外す（連続記録を守る）
  if (!isRun) required = required.filter(i => i.runOnly !== true);
  const mode = log.mode || 'home';
  if (mode === 'travel') {
    const pack = new Set(log.packList || []);
    required = required.filter(i => pack.has(i.id));
  }
  return required;
}
function dayCompletion(log, sched) {
  const required = requiredItemsForDay(log, sched);
  if (required.length === 0) return 1;
  let done = 0;
  for (const it of required) if (log.entries[it.id] && log.entries[it.id].checked) done++;
  return done / required.length;
}
function isAchieved(log, sched) { return dayCompletion(log, sched) >= 1; }

async function computeStats() {
  const logs = await idbAll('logs');
  const byDate = {}; logs.forEach(l => byDate[l.date] = l);
  const tKey = todayKey();

  // 連続達成（今日が未完了でも崩さない：昨日から数える）
  let cur = 0;
  let cursor = parseKey(tKey);
  // 今日を判定
  {
    const log = byDate[tKey];
    const sched = scheduleByVersion(log ? log.scheduleVersion : state.currentVersion);
    if (log && isAchieved(log, sched)) { cur++; }
    cursor.setDate(cursor.getDate() - 1);
  }
  // 過去へ
  while (true) {
    const k = ymd(cursor);
    const log = byDate[k];
    if (!log) break;
    const sched = scheduleByVersion(log.scheduleVersion);
    if (isAchieved(log, sched)) { cur++; cursor.setDate(cursor.getDate() - 1); } else break;
  }

  // 最長連続・達成日数
  const achievedKeys = logs.filter(l => isAchieved(l, scheduleByVersion(l.scheduleVersion))).map(l => l.date).sort();
  let best = 0, run = 0, prev = null;
  for (const k of achievedKeys) {
    if (prev) {
      const pd = parseKey(prev); pd.setDate(pd.getDate() + 1);
      run = (ymd(pd) === k) ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run); prev = k;
  }

  return { current: cur, best, recordedDays: logs.length, achievedDays: achievedKeys.length };
}

async function computeAdherence() {
  const logs = await idbAll('logs');
  const byDate = {}; logs.forEach(l => byDate[l.date] = l);
  const sched = currentSchedule();
  const N = state.settings.adhWindow;
  const out = [];
  const start = parseKey(todayKey()); start.setDate(start.getDate() - (N - 1));
  for (const it of sched.items) {
    if (it.enabled === false) continue;
    let denom = 0, num = 0;
    const cur = new Date(start);
    for (let i = 0; i < N; i++) {
      const k = ymd(cur);
      const log = byDate[k];
      const daySched = scheduleByVersion(log ? log.scheduleVersion : state.currentVersion);
      const existsThatDay = daySched.items.some(x => x.id === it.id && x.enabled !== false);
      if (existsThatDay) {
        // 旅行モードの日は持参リストに無い項目を「期待されていない」とみなして分母から除外
        const dayMode = log && log.mode ? log.mode : 'home';
        const inPack = dayMode === 'travel' && log.packList ? log.packList.includes(it.id) : true;
        // runOnly項目は ラン日でない日は「期待されていない」とみなして分母から除外
        const isRunDayThatDay = !!(log && log.isRunDay === true);
        const runOK = !it.runOnly || isRunDayThatDay;
        if ((dayMode !== 'travel' || inPack) && runOK) {
          denom++;
          if (log && log.entries[it.id] && log.entries[it.id].checked) num++;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    out.push({ name: it.name, dose: it.dose, optional: !!it.optional, num, denom });
  }
  return out;
}

/* ============================================================
 * 描画ヘルパ
 * ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function badgeClass(badge) {
  if (!badge) return 'b-drink';
  if (badge.includes('空腹')) return 'b-empty';
  if (badge.includes('食後')) return 'b-after';
  if (badge.includes('コーヒー')) return 'b-drink';
  if (badge.includes('食')) return 'b-meal';   // 食事と / 食べ始め
  return 'b-drink';
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';

function ringHTML(pct) {
  const size = 58, sw = 6, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  const col = pct >= 1 ? 'var(--hiru)' : 'var(--ochre)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}"></circle>
    <circle class="prog" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}"
       stroke="${col}" stroke-dasharray="${c}" stroke-dashoffset="${off}"></circle>
    <text class="pct" x="50%" y="50%" dy="0.34em" text-anchor="middle" transform="rotate(90 ${size / 2} ${size / 2})"
       font-size="15" fill="var(--ink)">${Math.round(pct * 100)}</text>
  </svg>`;
}

/* ============================================================
 * 今日ビュー
 * ============================================================ */
let todayLog = null;

async function renderToday() {
  state.todayKey = todayKey();
  todayLog = await ensureLog(state.todayKey);
  const sched = currentSchedule();

  $('#todayDate').textContent = fmtJPFull(state.todayKey);
  // モード表示・トグル状態を反映
  updateModeUI();

  const visible = visibleItemsToday(sched);
  const wrap = $('#todayBlocks'); wrap.innerHTML = '';
  for (const b of sched.blocks) {
    const items = visible.filter(i => i.block === b.id);
    if (items.length === 0) continue;
    const doneReq = items.filter(i => !i.optional && todayLog.entries[i.id] && todayLog.entries[i.id].checked).length;
    const totReq = items.filter(i => !i.optional).length;

    const block = document.createElement('div');
    block.className = 'block';
    let rows = '';
    for (const it of items) {
      const on = !!(todayLog.entries[it.id] && todayLog.entries[it.id].checked);
      const hasNote = !!state.itemNotes[it.id];
      rows += `<button class="row${on ? ' on' : ''}${it.optional ? ' opt' : ''}" data-id="${esc(it.id)}">
        <span class="cb">${CHECK_SVG}</span>
        <span class="name">${esc(it.name)}${it.optional ? '<span class="opt-tag">任意</span>' : ''}</span>
        <span class="amt">${esc(it.dose)}${it.doseNote ? `<small>${esc(it.doseNote)}</small>` : ''}</span>
        <span class="badge ${badgeClass(it.badge)}">${esc(it.badge || '')}</span>
        <span class="info-btn${hasNote ? ' has-note' : ''}" data-info-id="${esc(it.id)}" aria-label="解説を見る">i</span>
      </button>`;
    }
    block.innerHTML = `<div class="block-head" style="background:${esc(b.color)}">
        <span class="t">${esc(b.label)}</span>
        <span class="ctx">${esc(b.context || '')}</span>
        <span class="bcount">${doneReq}/${totReq}</span>
      </div><div class="rows">${rows}</div>`;
    wrap.appendChild(block);
  }

  // 行タップ（ⓘアイコン押下時は詳細ビュー、それ以外は check toggle）
  $$('#todayBlocks .row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const info = e.target.closest('.info-btn');
      if (info) { e.preventDefault(); e.stopPropagation(); openItemDetail(info.dataset.infoId, 'today'); return; }
      toggleToday(btn.dataset.id);
    });
  });

  // メモ
  const ta = $('#todayNote');
  ta.value = todayLog.note || '';

  updateRing();
}

let noteTimer = null;
function bindTodayNote() {
  const ta = $('#todayNote');
  ta.addEventListener('input', () => {
    todayLog.note = ta.value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => saveLog(todayLog), 400);
  });
}

async function toggleToday(itemId) {
  // 日付が変わっていたら作り直す（深夜にまたいだ場合の保険）
  if (todayKey() !== state.todayKey) { await renderToday(); return; }
  const cur = todayLog.entries[itemId] && todayLog.entries[itemId].checked;
  todayLog.entries[itemId] = { checked: !cur, checkedAt: !cur ? new Date().toISOString() : null };
  await saveLog(todayLog);

  const btn = $(`#todayBlocks .row[data-id="${CSS.escape(itemId)}"]`);
  if (btn) btn.classList.toggle('on', !cur);
  // ブロックのカウンタ更新
  refreshBlockCounts();
  updateRing();
}

function refreshBlockCounts() {
  const sched = currentSchedule();
  const visible = visibleItemsToday(sched);
  $$('#todayBlocks .block').forEach((blockEl, idx) => {
    const heads = sched.blocks.filter(b => visible.some(i => i.block === b.id));
    const b = heads[idx]; if (!b) return;
    const items = visible.filter(i => i.block === b.id && !i.optional);
    const done = items.filter(i => todayLog.entries[i.id] && todayLog.entries[i.id].checked).length;
    const c = blockEl.querySelector('.bcount'); if (c) c.textContent = `${done}/${items.length}`;
  });
}

function updateRing() {
  const sched = currentSchedule();
  const pct = dayCompletion(todayLog, sched);
  $('#ring').innerHTML = ringHTML(pct);
  // ストリークピル
  computeStats().then(s => {
    const pill = $('#streakPill');
    if (s.current > 0) { pill.hidden = false; $('#streakN').textContent = s.current; }
    else pill.hidden = true;
  });
}

/* ============================================================
 * 履歴ビュー（カレンダーヒートマップ）
 * ============================================================ */
async function renderHistory() {
  if (!state.calMonth) { const d = parseKey(todayKey()); state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); }
  const y = state.calMonth.getFullYear(), m = state.calMonth.getMonth();
  $('#calLabel').textContent = `${y}年${m + 1}月`;

  const logs = await idbAll('logs');
  const byDate = {}; logs.forEach(l => byDate[l.date] = l);

  const grid = $('#calGrid'); grid.innerHTML = '';
  WD.forEach(w => { const e = document.createElement('div'); e.className = 'cal-wd'; e.textContent = w; grid.appendChild(e); });

  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const tKey = todayKey();

  for (let i = 0; i < startPad; i++) { const e = document.createElement('div'); e.className = 'cal-day empty'; grid.appendChild(e); }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = ymd(new Date(y, m, d));
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    const log = byDate[key];
    let pct = 0, hasNote = false;
    if (log) {
      pct = dayCompletion(log, scheduleByVersion(log.scheduleVersion));
      hasNote = !!(log.note && log.note.trim());
    }
    // ヒートマップ色
    let bg = 'var(--paper)';
    if (log) {
      if (pct >= 1) bg = 'var(--ochre)';
      else if (pct >= 0.66) bg = 'rgba(189,138,44,.7)';
      else if (pct >= 0.34) bg = 'rgba(189,138,44,.45)';
      else if (pct > 0) bg = 'rgba(189,138,44,.22)';
    }
    cell.style.background = bg;
    if (pct >= 0.66) cell.style.color = '#fff';
    if (key === tKey) cell.classList.add('today');
    if (key === state.selectedDate) cell.classList.add('sel');
    if (key > tKey) cell.classList.add('future');
    cell.innerHTML = `${d}${hasNote ? '<span class="dot"></span>' : ''}`;
    cell.addEventListener('click', () => { state.selectedDate = key; renderHistory(); renderDayDetail(key); });
    grid.appendChild(cell);
  }

  if (state.selectedDate) renderDayDetail(state.selectedDate);
  else $('#dayDetail').innerHTML = '<div class="empty-state">日付をタップすると、その日の記録を確認・編集できます。</div>';
}

async function renderDayDetail(key) {
  const detail = $('#dayDetail');
  const log = await ensureLog(key);
  const sched = scheduleByVersion(log.scheduleVersion);
  const pct = dayCompletion(log, sched);
  const tKey = todayKey();
  const editable = key <= tKey; // 未来日は編集不可

  const dayMode = log.mode || 'home';
  const modeBadge = dayMode === 'travel' ? '<span class="day-mode-pill">🧳 旅行モード</span>' : '';
  let html = `<div class="dd-head"><span class="d">${esc(fmtJP(key))}</span>${modeBadge}
     <span class="pct">${Math.round(pct * 100)}%</span></div>`;
  html += `<p class="dd-hint">${editable ? 'タップで後から修正できます（飲み忘れ・付け忘れの訂正用）。' : '未来の日付は記録できません。'}</p>`;

  const visibleForDay = visibleItemsForLog(log, sched);
  for (const b of sched.blocks) {
    const items = visibleForDay.filter(i => i.block === b.id);
    if (items.length === 0) continue;
    let rows = '';
    for (const it of items) {
      const on = !!(log.entries[it.id] && log.entries[it.id].checked);
      const hasNote = !!state.itemNotes[it.id];
      rows += `<button class="row${on ? ' on' : ''}${it.optional ? ' opt' : ''}" data-id="${esc(it.id)}">
        <span class="cb">${CHECK_SVG}</span>
        <span class="name">${esc(it.name)}${it.optional ? '<span class="opt-tag">任意</span>' : ''}</span>
        <span class="amt">${esc(it.dose)}${it.doseNote ? `<small>${esc(it.doseNote)}</small>` : ''}</span>
        <span class="badge ${badgeClass(it.badge)}">${esc(it.badge || '')}</span>
        <span class="info-btn${hasNote ? ' has-note' : ''}" data-info-id="${esc(it.id)}" aria-label="解説を見る">i</span>
      </button>`;
    }
    html += `<div class="block" style="margin-bottom:10px">
      <div class="block-head" style="background:${esc(b.color)}"><span class="t">${esc(b.label)}</span>
      <span class="ctx">${esc(b.context || '')}</span></div><div class="rows">${rows}</div></div>`;
  }
  html += `<div class="note-card"><label>この日のメモ</label>
    <textarea id="dayNote" placeholder="${editable ? '任意。自動保存されます。' : ''}">${esc(log.note || '')}</textarea></div>`;

  detail.innerHTML = html;

  // ⓘ アイコンは編集不可日でも有効（解説は読める）
  $$('#dayDetail .row .info-btn').forEach(info => {
    info.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      openItemDetail(info.dataset.infoId, 'history');
    });
  });
  if (editable) {
    $$('#dayDetail .row').forEach(btn => btn.addEventListener('click', async (e) => {
      // ⓘ タップは詳細ビュー（上のハンドラで先に処理）— check toggle はそれ以外
      if (e.target.closest('.info-btn')) return;
      const id = btn.dataset.id;
      const cur = log.entries[id] && log.entries[id].checked;
      log.entries[id] = { checked: !cur, checkedAt: !cur ? new Date().toISOString() : null };
      await saveLog(log);
      btn.classList.toggle('on', !cur);
      const np = dayCompletion(log, sched);
      detail.querySelector('.pct').textContent = `${Math.round(np * 100)}%`;
      renderHistory();
      if (key === state.todayKey) { todayLog = log; updateRing(); }
    }));
    const dn = $('#dayNote');
    let t = null;
    dn.addEventListener('input', () => { log.note = dn.value; clearTimeout(t); t = setTimeout(() => saveLog(log), 400); });
  }
}

/* ============================================================
 * 設定ビュー
 * ============================================================ */
async function renderSettings() {
  // 境界時刻セレクト
  const sel = $('#boundarySel');
  if (!sel.options.length) {
    for (let h = 0; h <= 12; h++) {
      const o = document.createElement('option'); o.value = h;
      o.textContent = h === 0 ? '0時（標準）' : `${h}時`;
      sel.appendChild(o);
    }
    sel.addEventListener('change', async () => {
      state.settings.dayBoundaryHour = Number(sel.value);
      await idbPut('meta', { key: 'settings', value: state.settings });
      toast('境界時刻を保存しました');
      renderToday();
    });
  }
  sel.value = String(state.settings.dayBoundaryHour);
  $('#adhWindow').textContent = state.settings.adhWindow;
  $('#schedVer').textContent = state.currentVersion;
  $('#appInfo').textContent = `サプリ摂取トラッカー v1.0 ／ 全データ端末内（IndexedDB）／ 記録した日数：${(await idbAll('logs')).length}日`;

  const s = await computeStats();
  $('#statStreak').textContent = s.current;
  $('#statBest').textContent = s.best;
  $('#statDays').textContent = s.recordedDays;
  $('#statAchieved').textContent = s.achievedDays;

  const adh = await computeAdherence();
  const list = $('#adhList');
  if (adh.length === 0) { list.innerHTML = '<div class="muted">項目がありません。</div>'; }
  else {
    list.innerHTML = adh.map(a => {
      const pct = a.denom ? Math.round(a.num / a.denom * 100) : 0;
      return `<div class="adh">
        <div class="adh-top"><span>${esc(a.name)}${a.optional ? '<span class="opt-tag" style="margin-left:6px">任意</span>' : ''}</span>
          <span class="frac">${a.num}/${a.denom}日 ・ ${pct}%</span></div>
        <div class="adh-bar"><div class="adh-fill" style="width:${pct}%;background:${a.optional ? 'var(--gogo)' : 'var(--green)'}"></div></div>
      </div>`;
    }).join('');
  }
}

/* ============================================================
 * サプリ解説（item-detail）
 *   タップでⓘアイコン → 詳細ビュー（5セクションのテンプレ入り）
 *   別Chatに渡すための土台。編集モードでMarkdown手入力→保存
 * ============================================================ */

/** itemIdから schedule items を全バージョンから探して返す（過去日からの遷移にも対応） */
function findItemAcross(itemId) {
  for (let i = state.scheduleVersions.length - 1; i >= 0; i--) {
    const it = state.scheduleVersions[i].items.find(x => x.id === itemId);
    if (it) return it;
  }
  return null;
}

/** 詳細ビューを開く */
function openItemDetail(itemId, returnTo) {
  state.detailItemId = itemId;
  state.detailReturnTo = returnTo || 'today';
  state.detailEditing = false;
  showView('item-detail');
  renderItemDetail();
}

/** 表示モードでのレンダリング */
function renderItemDetail() {
  const it = findItemAcross(state.detailItemId);
  if (!it) { showView('today'); return; }
  const md = state.itemNotes[it.id] || ITEM_NOTE_TEMPLATE;
  $('#itemDetailTitle').textContent = it.name;
  // 用量・タイミング・任意/必須を上部の小カードに出す
  const metaParts = [];
  metaParts.push(`<span class="amt-inline">${esc(it.dose || '')}</span>`);
  if (it.doseNote) metaParts.push(`<span class="note-inline">${esc(it.doseNote)}</span>`);
  if (it.badge) metaParts.push(`<span class="badge ${badgeClass(it.badge)}">${esc(it.badge)}</span>`);
  if (it.optional) metaParts.push('<span class="opt-tag">任意</span>');
  $('#itemDetailMeta').innerHTML = metaParts.join(' ');

  // 表示と編集の出し分け
  const isDefault = !state.itemNotes[it.id];
  if (state.detailEditing) {
    $('#itemDetailBody').hidden = true;
    $('#itemDetailEditArea').hidden = false;
    $('#itemDetailTextarea').value = md;
    $('#itemDetailHint').hidden = false;
    $('#itemDetailEditBtn').hidden = true;
    $('#itemDetailSaveBtn').hidden = false;
    $('#itemDetailCancelBtn').hidden = false;
    $('#itemDetailCopyBtn').hidden = false;
  } else {
    $('#itemDetailBody').hidden = false;
    $('#itemDetailEditArea').hidden = true;
    $('#itemDetailHint').hidden = !isDefault;  // テンプレ未編集なら案内表示
    $('#itemDetailEditBtn').hidden = false;
    $('#itemDetailSaveBtn').hidden = true;
    $('#itemDetailCancelBtn').hidden = true;
    $('#itemDetailCopyBtn').hidden = true;
    $('#itemDetailBody').innerHTML = renderMarkdown(md);
  }
}

/** 編集モードに切替 */
function startEditItemDetail() {
  state.detailEditing = true;
  renderItemDetail();
  setTimeout(() => { const ta = $('#itemDetailTextarea'); if (ta) { ta.focus(); ta.setSelectionRange(0, 0); } }, 50);
}

/** 保存 */
async function saveItemDetail() {
  const md = $('#itemDetailTextarea').value;
  if (md.trim() === '' || md.trim() === ITEM_NOTE_TEMPLATE.trim()) {
    // 空 or テンプレのまま → 削除扱い（テンプレに戻す）
    delete state.itemNotes[state.detailItemId];
  } else {
    state.itemNotes[state.detailItemId] = md;
  }
  await idbPut('meta', { key: 'itemNotes', value: state.itemNotes });
  state.detailEditing = false;
  toast('解説を保存しました');
  renderItemDetail();
}

/** キャンセル */
function cancelEditItemDetail() {
  state.detailEditing = false;
  renderItemDetail();
}

/** 戻る */
function backFromItemDetail() {
  showView(state.detailReturnTo === 'history' ? 'history' : 'today');
}

/** クリップボードへコピー（別Chatに渡すため） */
async function copyItemDetailToClipboard() {
  const ta = $('#itemDetailTextarea');
  const text = ta.value;
  try {
    await navigator.clipboard.writeText(text);
    toast('コピーしました（別Chatに貼り付け）');
  } catch (e) {
    // フォールバック：select+execCommand
    ta.focus(); ta.select();
    try { document.execCommand('copy'); toast('コピーしました'); } catch { toast('コピーできませんでした'); }
  }
}

/** 軽量Markdown描画：## 見出し / - 箇条書き / 空行で段落区切り / URL自動リンク */
function renderMarkdown(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  const linkify = (txt) => {
    const esced = esc(txt);
    return esced.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    const h3 = line.match(/^##\s+(.+)$/);
    const li = line.match(/^-\s+(.+)$/);
    if (h3) {
      closeList();
      html += `<h3 class="md-h3">${esc(h3[1])}</h3>`;
    } else if (li) {
      if (!inList) { html += '<ul class="md-ul">'; inList = true; }
      html += `<li>${linkify(li[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
      // 段落区切り（連続する空行は1つに）
      if (!html.endsWith('</p>') && !html.endsWith('</h3>') && !html.endsWith('</ul>') && html !== '') html += '<br>';
    } else {
      closeList();
      html += `<p class="md-p">${linkify(line)}</p>`;
    }
  }
  closeList();
  return html;
}

/* ============================================================
 * モード切替（在宅 ⇄ 旅行）と 持参リスト編集
 * ============================================================ */

/** 現在のmode/isRunDayをUIに反映（モードバー・🧳バッジ・持参リスト編集ボタン・🏃ラントグル） */
function updateModeUI() {
  const mode = currentMode();
  $$('#modeBar .mode-btn').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  const ind = $('#travelIndicator'); if (ind) ind.hidden = (mode !== 'travel');
  const pbtn = $('#packEditBtnInline'); if (pbtn) pbtn.hidden = (mode !== 'travel');
  const runBtn = $('#runToggle'); if (runBtn) runBtn.classList.toggle('on', currentIsRunDayToday());
  const runInd = $('#runIndicator'); if (runInd) runInd.hidden = !currentIsRunDayToday();
}

/** 🏃 今日走った トグル */
async function toggleRunDay() {
  // 日付が変わっていたら作り直す（深夜にまたいだ場合の保険）
  if (todayKey() !== state.todayKey) { await renderToday(); return; }
  todayLog.isRunDay = !todayLog.isRunDay;
  await saveLog(todayLog);
  await renderToday();
  toast(todayLog.isRunDay ? '🏃 ラン日に切替えました' : 'ラン日OFF');
}

/** モード切替（在宅 ⇄ 旅行） */
async function setMode(newMode) {
  if (newMode === currentMode()) return;
  // 旅行モードへ切替時、持参リストが空なら必ず編集画面へ
  if (newMode === 'travel' && (!state.travelPack || state.travelPack.length === 0)) {
    state.settings.mode = newMode;
    await idbPut('meta', { key: 'settings', value: state.settings });
    openPackEditor(true);
    return;
  }
  state.settings.mode = newMode;
  await idbPut('meta', { key: 'settings', value: state.settings });
  // 今日のログ（あれば）にmode/packListを反映
  if (todayLog) {
    todayLog.mode = newMode;
    if (newMode === 'travel') todayLog.packList = [...(state.travelPack || [])];
    else delete todayLog.packList;
    await saveLog(todayLog);
  }
  toast(newMode === 'travel' ? '🧳 旅行モードに切替えました' : '🏠 在宅モードに切替えました');
  await renderToday();
}

/** 持参リスト編集画面を開く */
function openPackEditor(fromModeToggle) {
  // 現在のpackをドラフトにコピー（無ければ全項目チェック済みでスタート）
  const all = currentSchedule().items.filter(i => i.enabled !== false).map(i => i.id);
  const baseSet = new Set(state.travelPack && state.travelPack.length ? state.travelPack : all);
  state.packDraft = baseSet;
  state.packEditorOpenedFromToggle = !!fromModeToggle;
  showView('pack');
  renderPackEditor();
}

function renderPackEditor() {
  const sched = currentSchedule();
  const list = $('#packList'); list.innerHTML = '';
  for (const b of sched.blocks) {
    const items = sched.items.filter(i => i.block === b.id && i.enabled !== false);
    if (items.length === 0) continue;
    const sec = document.createElement('div');
    sec.className = 'pack-section';
    let rows = '';
    for (const it of items) {
      const checked = state.packDraft.has(it.id);
      rows += `<label class="pack-row${checked ? ' on' : ''}" data-id="${esc(it.id)}">
        <input type="checkbox" ${checked ? 'checked' : ''}>
        <span class="pack-name">${esc(it.name)}${it.optional ? '<span class="opt-tag">任意</span>' : ''}</span>
        <span class="pack-dose">${esc(it.dose)}</span>
      </label>`;
    }
    sec.innerHTML = `<div class="pack-block-head" style="background:${esc(b.color)}">${esc(b.label)}</div><div class="pack-rows">${rows}</div>`;
    list.appendChild(sec);
  }
  // 全選択／全解除のクイックボタン
  const ctrl = $('#packQuickCtrl');
  if (ctrl) ctrl.innerHTML = `<button class="btn ghost" id="packAll">全部✓</button><button class="btn ghost" id="packNone">全部外す</button>`;
  $$('#packList .pack-row input').forEach(inp => {
    inp.addEventListener('change', () => {
      const row = inp.closest('.pack-row');
      const id = row.dataset.id;
      if (inp.checked) state.packDraft.add(id); else state.packDraft.delete(id);
      row.classList.toggle('on', inp.checked);
      updatePackCount();
    });
  });
  const allBtn = $('#packAll'); if (allBtn) allBtn.addEventListener('click', () => {
    for (const it of sched.items) if (it.enabled !== false) state.packDraft.add(it.id);
    renderPackEditor();
  });
  const noneBtn = $('#packNone'); if (noneBtn) noneBtn.addEventListener('click', () => {
    state.packDraft.clear();
    renderPackEditor();
  });
  updatePackCount();
}

function updatePackCount() {
  const c = $('#packCount'); if (!c) return;
  const total = currentSchedule().items.filter(i => i.enabled !== false).length;
  c.textContent = `${state.packDraft.size}/${total} 項目を持参`;
}

async function savePackList() {
  state.travelPack = [...state.packDraft];
  await idbPut('meta', { key: 'travelPack', value: state.travelPack });
  // 持参リスト編集→保存で旅行モードへ確定（toggle 経由オープン時）or 単独編集時はモード維持
  if (state.packEditorOpenedFromToggle) {
    // 既にモードはtravelに変更済み。今日のログにpackListを反映
    if (todayLog) {
      todayLog.mode = 'travel';
      todayLog.packList = [...state.travelPack];
      await saveLog(todayLog);
    }
    toast('🧳 旅行モード（持参リスト保存）');
  } else {
    // 旅行モード中なら今日のログも更新
    if (currentMode() === 'travel' && todayLog) {
      todayLog.packList = [...state.travelPack];
      await saveLog(todayLog);
    }
    toast('持参リストを保存しました');
  }
  showView('today');
}

function cancelPackList() {
  // 編集モードからの起動で持参リスト未確定→在宅モードへ戻す
  if (state.packEditorOpenedFromToggle && (!state.travelPack || state.travelPack.length === 0)) {
    state.settings.mode = 'home';
    idbPut('meta', { key: 'settings', value: state.settings });
  }
  showView('today');
}

/* ============================================================
 * スケジュール編集
 * ============================================================ */
function openEditor() {
  const sched = currentSchedule();
  state.editDraft = JSON.parse(JSON.stringify(sched.items));
  showView('editor');
  renderEditor();
}
function renderEditor() {
  const sched = currentSchedule();
  const list = $('#editorList'); list.innerHTML = '';
  const blockOpts = sched.blocks.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('');

  state.editDraft.forEach((it, idx) => {
    const el = document.createElement('div');
    el.className = 'edit-item' + (it.enabled === false ? ' disabled' : '');
    el.innerHTML = `
      <div class="edit-head">
        <strong>${esc(it.name || '（無題）')}</strong>
        <div class="ord">
          <button class="minibtn" data-act="up" data-i="${idx}" aria-label="上へ">↑</button>
          <button class="minibtn" data-act="down" data-i="${idx}" aria-label="下へ">↓</button>
          <button class="minibtn" data-act="del" data-i="${idx}" aria-label="削除">🗑</button>
        </div>
      </div>
      <div class="edit-grid">
        <div class="full"><label>名前</label><input data-f="name" data-i="${idx}" value="${esc(it.name)}"></div>
        <div><label>用量</label><input data-f="dose" data-i="${idx}" value="${esc(it.dose)}"></div>
        <div><label>用量メモ</label><input data-f="doseNote" data-i="${idx}" value="${esc(it.doseNote || '')}"></div>
        <div><label>時間帯</label><select data-f="block" data-i="${idx}">${blockOpts}</select></div>
        <div><label>タイミング印</label><input data-f="badge" data-i="${idx}" value="${esc(it.badge || '')}"></div>
        <div class="full" style="display:flex;gap:18px;margin-top:4px">
          <label class="chk"><input type="checkbox" data-f="optional" data-i="${idx}" ${it.optional ? 'checked' : ''}>任意（達成率に含めない）</label>
          <label class="chk"><input type="checkbox" data-f="enabled" data-i="${idx}" ${it.enabled !== false ? 'checked' : ''}>有効</label>
        </div>
      </div>`;
    el.querySelector('select[data-f="block"]').value = it.block;
    list.appendChild(el);
  });

  // 入力反映
  $$('#editorList input,#editorList select').forEach(inp => {
    const i = Number(inp.dataset.i), f = inp.dataset.f;
    inp.addEventListener('input', () => {
      if (f === 'optional') state.editDraft[i].optional = inp.checked;
      else if (f === 'enabled') { state.editDraft[i].enabled = inp.checked; inp.closest('.edit-item').classList.toggle('disabled', !inp.checked); }
      else state.editDraft[i][f] = inp.value;
      if (f === 'name') inp.closest('.edit-item').querySelector('strong').textContent = inp.value || '（無題）';
    });
  });
  $$('#editorList .minibtn').forEach(btn => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.i), act = btn.dataset.act;
    if (act === 'del') { if (confirm('この項目を削除しますか？（過去の記録は残ります）')) { state.editDraft.splice(i, 1); renderEditor(); } }
    else if (act === 'up' && i > 0) { [state.editDraft[i - 1], state.editDraft[i]] = [state.editDraft[i], state.editDraft[i - 1]]; renderEditor(); }
    else if (act === 'down' && i < state.editDraft.length - 1) { [state.editDraft[i + 1], state.editDraft[i]] = [state.editDraft[i], state.editDraft[i + 1]]; renderEditor(); }
  }));
}
function addEditItem() {
  const sched = currentSchedule();
  const id = 'custom_' + Date.now().toString(36);
  state.editDraft.push({ id, block: sched.blocks[0].id, name: '', dose: '', doseNote: '', badge: '食事と', optional: false, enabled: true });
  renderEditor();
  $('#editorList').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function saveSchedule() {
  // バリデーション：名前必須
  const valid = state.editDraft.filter(i => (i.name || '').trim());
  if (valid.length === 0) { toast('項目がありません'); return; }
  const newVer = new Date().toISOString();
  const sched = currentSchedule();
  const snapshot = { version: newVer, blocks: JSON.parse(JSON.stringify(sched.blocks)), items: valid };
  state.scheduleVersions.push(snapshot);
  state.currentVersion = newVer;
  await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
  await idbPut('meta', { key: 'currentVersion', value: newVer });
  toast('スケジュールを保存しました');
  showView('settings'); renderSettings();
}
async function resetSchedule() {
  if (!confirm('スケジュールを初期状態に戻します。よろしいですか？（過去の記録は残ります）')) return;
  const newVer = new Date().toISOString();
  const snap = { version: newVer, blocks: JSON.parse(JSON.stringify(SEED.blocks)), items: JSON.parse(JSON.stringify(SEED.items)) };
  state.scheduleVersions.push(snap);
  state.currentVersion = newVer;
  await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
  await idbPut('meta', { key: 'currentVersion', value: newVer });
  toast('初期スケジュールに戻しました');
  renderSettings();
}

/* ============================================================
 * エクスポート / インポート
 * ============================================================ */
function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportJson() {
  const logs = await idbAll('logs');
  const data = {
    app: 'supplement-tracker', exportedAt: new Date().toISOString(),
    settings: state.settings, scheduleVersions: state.scheduleVersions, currentVersion: state.currentVersion, logs
  };
  download(`supplement-tracker_${todayKey()}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('JSONを書き出しました');
}
async function exportCsv() {
  const logs = (await idbAll('logs')).sort((a, b) => a.date < b.date ? -1 : 1);
  const rows = [['date', 'itemId', 'name', 'checked', 'timestamp']];
  for (const log of logs) {
    const sched = scheduleByVersion(log.scheduleVersion);
    for (const it of sched.items) {
      if (it.enabled === false) continue;
      const e = log.entries[it.id];
      rows.push([log.date, it.id, it.name, e && e.checked ? '1' : '0', (e && e.checkedAt) || '']);
    }
  }
  const csv = rows.map(r => r.map(c => {
    const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  download(`supplement-tracker_${todayKey()}.csv`, '﻿' + csv, 'text/csv');
  toast('CSVを書き出しました');
}
async function importJson(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.app !== 'supplement-tracker' || !Array.isArray(data.logs)) { toast('対応していないファイルです'); return; }
    if (!confirm('現在のデータを、このファイルの内容で置き換えます。よろしいですか？')) return;
    if (data.settings) { state.settings = Object.assign(state.settings, data.settings); await idbPut('meta', { key: 'settings', value: state.settings }); }
    if (data.scheduleVersions) { state.scheduleVersions = data.scheduleVersions; await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions }); }
    if (data.currentVersion) { state.currentVersion = data.currentVersion; await idbPut('meta', { key: 'currentVersion', value: state.currentVersion }); }
    // ログ全消し→投入
    const existing = await idbAll('logs');
    for (const l of existing) await idbDelete('logs', l.date);
    for (const l of data.logs) await idbPut('logs', l);
    toast('復元しました');
    renderToday(); renderSettings();
  } catch (e) { toast('読み込みに失敗しました'); }
}

/* ============================================================
 * ビュー切替
 * ============================================================ */
function showView(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const map = { today: 'view-today', history: 'view-history', settings: 'view-settings', editor: 'view-editor', pack: 'view-pack', 'item-detail': 'view-itemDetail' };
  $('#' + map[name]).classList.add('active');
  // ボトムナビは「pack」「editor」「item-detail」は元の戻り先タブをアクティブ風に維持
  let navTab = name;
  if (name === 'pack' || name === 'editor') navTab = 'today';
  else if (name === 'item-detail') navTab = state.detailReturnTo === 'history' ? 'history' : 'today';
  $$('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === navTab));
  $('#todayTitle').textContent = { today: '今日', history: '履歴', settings: '設定', editor: '設定', pack: '持参リスト', 'item-detail': '解説' }[name];

  if (name === 'today') renderToday();
  else if (name === 'history') renderHistory();
  else if (name === 'settings') renderSettings();
}

/* ============================================================
 * 起動
 * ============================================================ */
async function init() {
  _db = await openDB();

  // メタ読み込み or 初期化
  const s = await idbGet('meta', 'settings');
  if (s) state.settings = Object.assign(state.settings, s.value);

  let versions = await idbGet('meta', 'scheduleVersions');
  if (!versions) {
    const v0 = { version: SEED.scheduleVersion, blocks: SEED.blocks, items: SEED.items.map(i => ({ ...i, enabled: true })) };
    state.scheduleVersions = [v0];
    state.currentVersion = SEED.scheduleVersion;
    await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
    await idbPut('meta', { key: 'currentVersion', value: state.currentVersion });
  } else {
    state.scheduleVersions = versions.value;
    const cv = await idbGet('meta', 'currentVersion');
    state.currentVersion = cv ? cv.value : state.scheduleVersions[state.scheduleVersions.length - 1].version;
  }

  // 起動時マイグレーション：ソース側のシードに新しい版（SEED.scheduleVersion）が来ていて、
  // まだ取り込んでいなければ新バージョンとして適用する（＝アプリ更新でスケジュールが変わったとき）。
  // 過去ログは当時の版のまま不変（scheduleByVersion）。手動編集（ISO版）は上書きしない。
  const seedKnown = state.scheduleVersions.some(v => v.version === SEED.scheduleVersion);
  if (!seedKnown) {
    const seedSnap = { version: SEED.scheduleVersion, blocks: JSON.parse(JSON.stringify(SEED.blocks)), items: SEED.items.map(i => ({ ...i, enabled: true })) };
    state.scheduleVersions.push(seedSnap);
    state.currentVersion = SEED.scheduleVersion;
    await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
    await idbPut('meta', { key: 'currentVersion', value: state.currentVersion });
  }

  // 各サプリの解説（itemNotes）ロード
  const inotes = await idbGet('meta', 'itemNotes');
  state.itemNotes = (inotes && inotes.value && typeof inotes.value === 'object') ? inotes.value : {};

  // SEED_NOTES マージ：itemNotes が空の項目だけプリ書き解説を埋める。
  // ユーザーが編集済みの項目は上書きしない。SEED_NOTES_VERSION が変わったときだけ走る。
  const appliedNotesVer = await idbGet('meta', 'seedNotesAppliedVersion');
  if (!appliedNotesVer || appliedNotesVer.value !== SEED_NOTES_VERSION) {
    let dirty = false;
    for (const [id, md] of Object.entries(SEED_NOTES)) {
      if (!state.itemNotes[id]) {
        state.itemNotes[id] = md;
        dirty = true;
      }
    }
    if (dirty) await idbPut('meta', { key: 'itemNotes', value: state.itemNotes });
    await idbPut('meta', { key: 'seedNotesAppliedVersion', value: SEED_NOTES_VERSION });
  }

  // 持参リスト（travelPack）ロード or 初期化
  const tp = await idbGet('meta', 'travelPack');
  let packFreshInit = false;
  if (tp && Array.isArray(tp.value)) {
    state.travelPack = tp.value;
  } else {
    // 未初期化：マスター全項目を「両方」前提でデフォルト持参リスト化
    state.travelPack = currentSchedule().items.filter(i => i.enabled !== false).map(i => i.id);
    await idbPut('meta', { key: 'travelPack', value: state.travelPack });
    packFreshInit = true;
  }

  // マイグレ直後：SEEDの新項目を持参リストにも追加（"両方"前提）。
  // pack新規初期化時は全項目入れ済みなのでスキップ。手動で除外した項目は再追加しない
  // （seedJustMigrated=true でも、SEEDに「新たに登場した」項目だけが対象）
  if (!seedKnown && !packFreshInit) {
    const packSet = new Set(state.travelPack);
    // 旧スケジュール群に含まれず・新SEEDで初登場の項目のみ追加
    const oldIds = new Set();
    for (const v of state.scheduleVersions) {
      if (v.version === SEED.scheduleVersion) continue;
      for (const it of v.items) oldIds.add(it.id);
    }
    const newItemIds = SEED.items.filter(i => i.enabled !== false && !oldIds.has(i.id) && !packSet.has(i.id)).map(i => i.id);
    if (newItemIds.length > 0) {
      state.travelPack = [...state.travelPack, ...newItemIds];
      await idbPut('meta', { key: 'travelPack', value: state.travelPack });
    }
  }

  // イベント
  $$('nav.tabs button').forEach(b => b.addEventListener('click', () => showView(b.dataset.tab)));
  $('#prevMonth').addEventListener('click', () => { state.calMonth.setMonth(state.calMonth.getMonth() - 1); renderHistory(); });
  $('#nextMonth').addEventListener('click', () => { state.calMonth.setMonth(state.calMonth.getMonth() + 1); renderHistory(); });
  $('#openEditor').addEventListener('click', openEditor);
  $('#editorBack').addEventListener('click', () => { showView('settings'); });
  $('#addItem').addEventListener('click', addEditItem);
  $('#saveSchedule').addEventListener('click', saveSchedule);
  $('#resetSchedule').addEventListener('click', resetSchedule);
  $('#exportJson').addEventListener('click', exportJson);
  $('#exportCsv').addEventListener('click', exportCsv);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
  bindTodayNote();

  // モード切替（在宅 ⇄ 旅行）
  $$('#modeBar .mode-btn').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  // 🏃 今日走った トグル
  const rBtn = $('#runToggle'); if (rBtn) rBtn.addEventListener('click', toggleRunDay);
  // 持参リスト編集ボタン（モードバー横・設定タブ両方）
  const pBtnInline = $('#packEditBtnInline'); if (pBtnInline) pBtnInline.addEventListener('click', () => openPackEditor(false));
  const pBtnSettings = $('#openPackEditor'); if (pBtnSettings) pBtnSettings.addEventListener('click', () => openPackEditor(false));
  // 持参リスト編集の保存・戻る
  const savePackBtn = $('#savePackBtn'); if (savePackBtn) savePackBtn.addEventListener('click', savePackList);
  const packBackBtn = $('#packBack'); if (packBackBtn) packBackBtn.addEventListener('click', cancelPackList);

  // サプリ解説（item-detail）
  const idBack = $('#itemDetailBack'); if (idBack) idBack.addEventListener('click', backFromItemDetail);
  const idEdit = $('#itemDetailEditBtn'); if (idEdit) idEdit.addEventListener('click', startEditItemDetail);
  const idSave = $('#itemDetailSaveBtn'); if (idSave) idSave.addEventListener('click', saveItemDetail);
  const idCancel = $('#itemDetailCancelBtn'); if (idCancel) idCancel.addEventListener('click', cancelEditItemDetail);
  const idCopy = $('#itemDetailCopyBtn'); if (idCopy) idCopy.addEventListener('click', copyItemDetailToClipboard);

  // 復帰時に日付が変わっていたら今日を更新
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && $('#view-today').classList.contains('active') && todayKey() !== state.todayKey) renderToday();
  });

  await renderToday();

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init().catch(err => {
  document.body.innerHTML = '<div class="empty-state" style="padding:60px 24px">起動に失敗しました。<br>' + esc(err.message || err) + '</div>';
});
