import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const supplierSteps = ['기본 정보', '확인 서류', '제출 확인'];
const tourSteps = ['사진', '코스', '가격 · 포함', '3무 확인', '미리보기'];
const cities = ['도쿄', '오사카', '교토', '후쿠오카', '삿포로', '기타'];
const yen = (value) => '¥' + Number(value || 0).toLocaleString('ja-JP');
const samplePhotos = [1, 2, 3].map((index) => '/design/osaka-' + index + '.png');

function useDraft(key, initial) {
  const [data, setData] = useState(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem(key)) }; }
    catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch { /* The form still works when storage is unavailable. */ }
  }, [key, data]);
  return [data, (changes) => setData((current) => ({ ...current, ...changes }))];
}

function Field({ label, hint, children }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Input({ data, update, name, label, optional = false, options, multiline, hint, ...props }) {
  const control = {
    value: data[name] ?? '',
    onChange: (event) => update({ [name]: event.target.value }),
    required: !optional,
    ...props,
  };
  return <Field label={label} hint={hint}>
    {options ? <select {...control}><option value="">선택해 주세요</option>{options.map((item) => <option key={item}>{item}</option>)}</select>
      : multiline ? <textarea {...control} /> : <input {...control} />}
  </Field>;
}

function Upload({ label, name, file, select, remove }) {
  return <div>
    <Field label={label} hint="JPG · PNG · PDF, 최대 10MB. 데모에서는 가상 서류를 사용해 주세요.">
      <input className="upload" name={name} type="file" accept=".jpg,.jpeg,.png,.pdf" required={!file}
        onChange={(event) => {
          const picked = event.target.files[0];
          if (!picked) return;
          const error = !/\.(jpe?g|png|pdf)$/i.test(picked.name) || picked.size > 10 * 1024 * 1024;
          if (error) {
            event.target.value = '';
            event.target.setCustomValidity('JPG, PNG, PDF 파일을 10MB 이하로 선택해 주세요.');
            event.target.reportValidity();
            return;
          }
          event.target.setCustomValidity('');
          select(name, picked.name);
        }} />
    </Field>
    {file && <div className="attachment"><span>{file}</span><button type="button" className="plain" onClick={() => remove(name)}>삭제</button></div>}
  </div>;
}

function Steps({ steps, current }) {
  return <ol className="steps" aria-label="신청 단계">{steps.map((label, index) =>
    <li key={label} aria-current={current === index ? 'step' : undefined} className={index < current ? 'done' : ''}>
      <span>{index < current ? '✓' : index + 1}</span>{label}
    </li>)}</ol>;
}

function Footer({ step, setStep, steps, submitLabel, disabled }) {
  return <div className="actions">
    {step > 0 && <button type="button" onClick={() => setStep(step - 1)}>이전</button>}
    <button type="submit" className="primary" disabled={disabled}>{step === steps.length - 1 ? submitLabel : '다음 · ' + steps[step + 1]}</button>
  </div>;
}

function Summary({ rows }) {
  return <dl className="summary">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>;
}

const initialSupplier = {
  type: '개인 가이드', city: '', language: '', sales: '', scope: '', work: '', credential: '', status: '작성 중',
};

function Supplier({ data, update, files, setFiles, demo }) {
  const [step, setStep] = useState(0);
  const company = data.type === '일본 등록 여행사';
  const workCheck = data.work === '체류자격·허가 확인 필요';
  const licensed = data.credential && data.credential !== '자격 표시 안 함';
  const fields = { data, update };
  const documents = company
    ? [['registration', '여행업 등록통지서'], ['guarantee', '영업보증금 공탁 또는 협회 분담금 납부 증빙']]
    : [
      ...(workCheck ? [['residence', '재류카드 및 유료 활동 범위 증빙']] : []),
      ...(licensed ? [['guideLicense', '통역안내사 등록증']] : []),
      ...(data.sales === '여행사 소속·계약' ? [['affiliation', '소속·계약 확인 자료']] : []),
    ];
  const special = data.scope === '교통·숙박 예약 또는 묶음 판매';
  const submitted = data.status !== '작성 중';

  function advance(event) {
    event.preventDefault();
    if (step < supplierSteps.length - 1) setStep(step + 1);
    else update({ status: '심사 중' });
  }

  return <>
    <header className="view-header"><div><h1>{data.status === '승인' ? '공급자 정보' : '공급자 신청'}</h1><p>{data.status === '승인' ? '등록된 공급자 정보와 심사 결과입니다.' : '일본에서 활동할 개인 가이드와 여행사의 신청을 받습니다.'}</p></div><span className="status">{data.status}</span></header>
    {submitted ? <section className="panel result" aria-live="polite">
      <h2>{data.status === '승인' ? '공급자 등록이 승인됐어요' : '공급자 신청을 제출했어요'}</h2>
      <p>{data.status === '승인' ? '투어를 작성해 게시 심사를 요청할 수 있어요.' : '제출한 정보와 서류를 검토할 차례입니다.'}</p>
      <Summary rows={[[company ? '여행사' : '신청자', data.name], ['활동 지역', '일본 · ' + data.city], ['심사 상태', data.status]]} />
      {data.status === '심사 중' && <div className="actions"><button type="button" onClick={() => { setStep(0); update({ status: '작성 중' }); }}>신청 내용 수정</button><button type="button" onClick={() => demo('supplier')}>데모에서 승인</button></div>}
    </section> : <>
      <Steps steps={supplierSteps} current={step} />
      <form className="panel" onSubmit={advance}>
        {step === 0 && <>
          <h2>어디서 어떻게 활동하나요?</h2>
          <div className="grid">
            <Input {...fields} name="type" label="공급자 유형" options={['개인 가이드', '일본 등록 여행사']} />
            <Field label="활동 국가"><input value="일본" readOnly /></Field>
            <Input {...fields} name="name" label={company ? '정식 상호' : '실명'} />
            <Input {...fields} name="email" label="담당자 이메일" type="email" />
            <Input {...fields} name="city" label="활동 지역" options={cities} />
            <Input {...fields} name="language" label="안내 언어" placeholder="예: 한국어, 일본어" />
            <Input {...fields} name="scope" label="제공 범위" options={['관광 안내만', '교통·숙박 예약 또는 묶음 판매']} />
            {!company && <Input {...fields} name="sales" label="활동 방식" options={['개인 직접 판매', '여행사 소속·계약']} />}
            {company && <Input {...fields} name="address" label="사업장 주소" />}
          </div>
        </>}
        {step === 1 && <>
          <h2>확인에 필요한 정보를 제출해 주세요</h2>
          <div className="grid">
            {company ? <>
              <Input {...fields} name="registrationNumber" label="여행업 등록번호" />
              <Input {...fields} name="registrationType" label="여행업 등록 구분" options={['제1종', '제2종', '제3종', '지역한정']} />
              <Input {...fields} name="authority" label="등록 관청" />
              <Input {...fields} name="expiry" label="등록 유효기간" type="date" min={new Date().toISOString().slice(0, 10)} />
            </> : <>
              <Input {...fields} name="work" label="일본 내 유료 활동 자격" options={['일본 국적', '체류자격·허가 확인 필요']} />
              <Input {...fields} name="credential" label="공개할 공인 자격" options={['자격 표시 안 함', '全国通訳案内士', '地域通訳案内士']} />
              <Input {...fields} name="phone" label="본인 확인용 연락처" type="tel" />
              {licensed && <><Input {...fields} name="guideNumber" label="안내사 등록번호" /><Input {...fields} name="guideLanguage" label="등록 언어" /></>}
              {data.credential === '地域通訳案内士' && <Input {...fields} name="guideRegion" label="등록 지역" />}
              {data.sales === '여행사 소속·계약' && <><Input {...fields} name="agency" label="소속 여행사" /><Input {...fields} name="agencyEmail" label="여행사 담당자 이메일" type="email" /></>}
            </>}
          </div>
          <div className="stack">{documents.map(([name, label]) => <Upload key={name} name={name} label={label} file={files[name]}
            select={(key, file) => setFiles((current) => ({ ...current, [key]: file }))}
            remove={(key) => setFiles((current) => ({ ...current, [key]: '' }))} />)}</div>
          {!company && <p className="note">일본에서는 관광 안내만 제공하는 경우 통역안내사 자격 표시를 선택할 수 있어요. 연락처 입력은 데모이며 실제 본인 인증은 진행되지 않습니다.</p>}
        </>}
        {step === 2 && <>
          <h2>신청 내용을 확인해 주세요</h2>
          <Summary rows={[[company ? '여행사' : '신청자', data.name], ['공급자 유형', data.type], ['활동 지역', '일본 · ' + data.city], ['안내 언어', data.language], ['제공 범위', data.scope], ...documents.map(([name, label]) => [label, files[name]])]} />
          {special && <p className="notice">교통·숙박을 예약하거나 묶어서 판매하는 경우 운영자가 판매 방식과 여행업 등록 범위를 별도 확인합니다.</p>}
          <label className="check"><input type="checkbox" required />제출한 정보와 서류가 정확합니다.</label>
        </>}
        <Footer step={step} setStep={setStep} steps={supplierSteps} submitLabel="공급자 심사 요청" />
      </form>
    </>}
  </>;
}

const initialTour = { title: '', status: '작성 중', stops: [''], pricing: '', onSite: '', tip: '', options: '', shopping: '' };

function Price({ data }) {
  const mandatoryTip = data.tip === '필수' ? Number(data.tipAmount || 0) : 0;
  return <aside className="price panel">
    <h3>여행자가 내는 금액</h3>
    <Summary rows={[[ '예약 결제', yen(data.pricing)], ['현장 필수 결제', yen(Number(data.onSite) + mandatoryTip)]]} />
    <div className="total"><span>1인 총액</span><strong>{yen(Number(data.pricing) + Number(data.onSite) + mandatoryTip)}</strong></div>
  </aside>;
}

function Tour({ data, update, supplier, images, setImages, demo }) {
  const [step, setStep] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const fields = { data, update };
  const submitted = ['심사 중', '게시 승인', '수정 요청'].includes(data.status);
  const isAgency = supplier.type === '일본 등록 여행사';
  const isAffiliated = !isAgency && supplier.sales === '여행사 소속·계약';
  const guideName = isAgency ? '가이드 배정 전' : supplier.name;
  const sellerName = isAffiliated ? supplier.agency : supplier.name;
  const participantRows = [['진행자', guideName], ['계약·결제 주체', sellerName]];

  function addPhotos(event) {
    const picked = Array.from(event.target.files);
    setPhotoError('');
    if (picked.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setPhotoError('JPG, PNG, WebP 사진을 10MB 이하로 선택해 주세요.');
    } else {
      setImages([...images, ...picked.slice(0, 5 - images.length).map((file) => URL.createObjectURL(file))]);
    }
    event.target.value = '';
  }

  function advance(event) {
    event.preventDefault();
    if (step === 0 && !images.length) {
      setPhotoError('투어 사진을 한 장 이상 추가해 주세요.');
      return;
    }
    if (step < tourSteps.length - 1) setStep(step + 1);
    else if (supplier.status === '승인') update({ status: '심사 중' });
  }

  return <>
    <header className="view-header"><div><h1>투어 게시 신청</h1><p>코스와 비용을 확인한 뒤 게시 심사를 요청하세요.</p></div><span className="status">{data.status}</span></header>
    {submitted ? <section className="panel result" aria-live="polite">
      <h2>{data.status === '수정 요청' ? '투어 내용을 보완해 주세요' : data.status === '게시 승인' ? '투어 게시가 승인됐어요' : '투어 게시 심사를 요청했어요'}</h2>
      <Summary rows={[[ '투어', data.title], ['투어 심사', data.status], ['공급자 심사', supplier.status]]} />
      {data.status === '수정 요청' && <p className="notice">현장 필수 비용 또는 선택 옵션에 빠진 정보가 있는지 확인해 주세요.</p>}
      {data.status === '심사 중' && isAgency && <p className="notice">등록된 가이드의 배정이 확인되면 게시할 수 있어요. 이 데모에서는 가이드 배정을 지원하지 않습니다.</p>}
      {data.status === '심사 중' && <div className="actions"><button type="button" onClick={() => demo('revision')}>데모에서 수정 요청</button>{!isAgency && <button type="button" onClick={() => demo('publish')}>데모에서 게시 승인</button>}</div>}
      {data.status === '수정 요청' && <div className="actions"><button className="primary" type="button" onClick={() => { setStep(images.length ? 2 : 0); update({ status: '작성 중' }); }}>수정 후 다시 신청</button></div>}
    </section> : <>
      <Steps steps={tourSteps} current={step} />
      <form className={[2, 4].includes(step) ? 'split' : ''} onSubmit={advance}>
        <section className="panel">
          {step === 0 && <>
            <h2>투어 사진을 올려주세요</h2>
            <p className="section-hint">첫 번째 사진을 대표 사진으로 사용해요. 최대 5장까지 올릴 수 있습니다.</p>
            <div className="photos">{images.map((url, index) => <div className="photo" key={url}>
              <img src={url} alt={'투어 사진 ' + (index + 1)} />
              <button type="button" aria-label={'사진 ' + (index + 1) + ' 삭제'} onClick={() => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                setImages(images.filter((image) => image !== url));
              }}>×</button>
            </div>)}{images.length < 5 && <label className="photo-add"><span>＋</span>사진 추가<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addPhotos} aria-label="투어 사진 추가" /></label>}</div>
            {photoError && <p className="error" role="alert">{photoError}</p>}
            <Input {...fields} name="title" label="투어 이름" placeholder="예: 도톤보리 골목 미식 도보 투어" maxLength={70} />
          </>}
          {step === 1 && <>
            <h2>어디를 둘러보나요?</h2>
            <div className="grid">
              <Input {...fields} name="city" label="지역" options={cities} />
              <Input {...fields} name="language" label="안내 언어" />
              <Input {...fields} name="duration" label="소요 시간" placeholder="예: 2시간 30분" />
              <Input {...fields} name="meeting" label="집결 장소" />
              <Input {...fields} name="schedule" label="예약 가능 일정" placeholder="예: 매주 토요일 10:00" />
              <Input {...fields} name="scope" label="교통·숙박 예약 또는 묶음 판매" options={['없음', '있음']} />
            </div>
            <h3>공급자 등록 정보</h3>
            <Summary rows={participantRows} />
            <div className="stack">{data.stops.map((stop, index) => <div className="stop" key={index}>
              <Field label={'방문 장소 ' + (index + 1)}><input required value={stop} onChange={(event) => update({ stops: data.stops.map((value, position) => position === index ? event.target.value : value) })} /></Field>
              {data.stops.length > 1 && <button type="button" onClick={() => update({ stops: data.stops.filter((_, position) => position !== index) })}>삭제</button>}
            </div>)}
            <button className="dashed" type="button" onClick={() => update({ stops: [...data.stops, ''] })}>＋ 방문 장소 추가</button></div>
          </>}
          {step === 2 && <>
            <h2>가격을 정해주세요</h2>
            <p className="section-hint">모든 금액은 여행자 1인 기준 일본 엔(JPY)으로 입력해 주세요.</p>
            <div className="grid">
              <Input {...fields} name="pricing" label="예약 결제액 (¥)" type="number" min="0" step="1" />
              <Input {...fields} name="onSite" label="필수 현장 결제액 (¥)" type="number" min="0" step="1" hint="입장료 등 필수 경비를 입력해 주세요. 팁은 다음 단계에서 입력합니다." />
            </div>
            {Number(data.onSite) > 0 && <Input {...fields} name="onSiteDetails" label="필수 현장비 내역" placeholder="예: 정원 입장료 ¥600" />}
            <Input {...fields} name="included" label="투어에 포함되는 항목" placeholder="예: 한국어 가이드, 라멘 1그릇, 음료 1잔" hint="식사나 체험이 포함되면 기본 제공 범위와 수량을 적어 주세요." />
            {data.excluded && <p className="notice">이전 초안에 적은 비용: {data.excluded}. 꼭 내야 하는 비용은 필수 현장비에, 여행자가 직접 선택할 수 있는 비용은 다음 단계에 적어 주세요.</p>}
            <Input {...fields} name="refund" label="취소·환불 조건" multiline rows="3" />
          </>}
          {step === 3 && <>
            <h2>팁·옵션·쇼핑을 확인해 주세요</h2>
            <Input {...fields} name="tip" label="팁을 받나요?" options={['없음', '선택', '필수']} />
            {data.tip === '필수' && <Input {...fields} name="tipAmount" label="필수 현장 팁 (¥)" type="number" min="1" step="1" hint="현장 결제액과 여행자 총액에 자동으로 더해집니다." />}
            {data.tip === '선택' && <Input {...fields} name="tipDetails" label="선택 팁 금액 또는 기준" />}
            <Input {...fields} name="options" label="여행자가 원할 때만 내는 비용이 있나요?" options={['없음', '있음']} hint="선택하지 않아도 안내된 투어를 그대로 이용할 수 있어야 합니다." />
            {data.options === '있음' && <Input {...fields} name="optionDetails" label="선택 비용 안내" placeholder="예: 기본 음료 1잔 포함, 추가 음료는 메뉴 가격에 따라 개인 결제" hint="정해진 가격이 있으면 금액을, 현장 가격이 달라질 수 있으면 결제 기준을 적어 주세요." multiline rows="3" />}
            <Input {...fields} name="shopping" label="코스에 쇼핑 방문이 있나요?" options={['없음', '있음']} />
            {data.shopping === '있음' && <Input {...fields} name="shoppingDetails" label="방문 장소 및 구매 조건" />}
          </>}
          {step === 4 && <>
            <h2>여행자에게 이렇게 보여요</h2>
            {images[0] && <img className="cover" src={images[0]} alt="투어 대표 사진" />}
            <h3>{data.title}</h3>
            <p className="section-hint">일본 · {data.city} · {data.language} · {data.duration}</p>
            <Summary rows={[[ '코스', data.stops.join(' → ')], ['집결 장소', data.meeting], ...participantRows, ['예약 가능 일정', data.schedule], ['투어에 포함', data.included], ['현장 필수 비용', Number(data.onSite) ? data.onSiteDetails : '없음'], ['팁', { 없음: '없음', 선택: '선택 · ' + data.tipDetails, 필수: '필수 · ' + yen(data.tipAmount) }[data.tip]], ['선택 시 추가 비용', data.options === '있음' ? data.optionDetails : '없음'], ['쇼핑 방문', data.shopping === '있음' ? data.shoppingDetails : '없음'], ['취소·환불', data.refund]]} />
            {isAgency && <p className="notice">게시 전에 등록된 가이드 배정을 확인해야 합니다.</p>}
            {data.scope === '있음' && <p className="notice">교통·숙박 예약 또는 묶음 판매가 포함되어 등록 범위를 함께 확인합니다.</p>}
            {supplier.status !== '승인' && <p className="notice">공급자 등록이 승인되면 게시 심사를 요청할 수 있어요.</p>}
          </>}
          <Footer step={step} setStep={setStep} steps={tourSteps} submitLabel="게시 심사 요청" disabled={step === 4 && supplier.status !== '승인'} />
        </section>
        {[2, 4].includes(step) && <Price data={data} />}
      </form>
    </>}
  </>;
}

function Dashboard({ supplier, tour, image, view }) {
  const hasTour = Boolean(tour.title || image || tour.status !== '작성 중');
  const publicTour = tour.status === '게시 승인';
  const tourAction = !hasTour ? '새 투어 만들기' : tour.status === '작성 중' ? '이어서 작성' : '투어 상태 보기';

  if (view === 'tours') return <>
    <header className="view-header"><div><h1>내 투어</h1><p>투어 작성과 게시 심사 상태를 확인하세요.</p></div>
      {!hasTour && <a className="primary button-link" href="#tour">새 투어 만들기</a>}</header>
    <section className="panel">
      {hasTour ? <div className="tour-entry">
        {image && <img className="tour-thumbnail" src={image} alt="" />}
        <div className="tour-entry-info"><h3>{tour.title || '제목 없는 투어'}</h3><p>{[tour.city, tour.language, tour.schedule].filter(Boolean).join(' · ')}</p></div>
        <span className="status">{tour.status}</span>
        <a className="button-link" href="#tour">{tourAction}</a>
      </div> : <div className="empty-tours"><h2>등록된 투어가 없어요</h2><p>첫 투어를 만들고 게시 심사를 요청해 보세요.</p></div>}
    </section>
  </>;

  return <>
    <header className="view-header"><div><h1>{supplier.name ? supplier.name + '님, 환영해요' : '가이드 콘솔'}</h1>
      <p>{publicTour ? '게시한 투어를 내 투어에서 확인하세요.' : '투어를 작성하고 게시까지 진행 상태를 확인하세요.'}</p></div></header>
    <ol className="onboarding panel">
      <li><span className="task-icon completed" aria-hidden="true">✓</span><div><h3>가입 · 서류 확인</h3><p>공급자 등록 승인</p></div></li>
      <li className={tour.status === '작성 중' ? 'current-task' : ''}>
        <span className={'task-icon' + (tour.status !== '작성 중' ? ' completed' : '')} aria-hidden="true">{tour.status !== '작성 중' ? '✓' : '2'}</span>
        <div><h3>첫 투어 만들기</h3><p>사진, 코스, 가격, 예약 가능 일정</p></div>
        {tour.status === '작성 중' && <a className="primary button-link" href="#tour">{tourAction}</a>}
      </li>
      <li className={['심사 중', '수정 요청'].includes(tour.status) ? 'current-task' : ''}>
        <span className={'task-icon' + (publicTour ? ' completed' : '')} aria-hidden="true">{publicTour ? '✓' : '3'}</span>
        <div><h3>투어 게시</h3><p>{tour.status === '작성 중' ? '작성 후 게시 심사를 요청할 수 있어요.' : tour.status}</p></div>
        {tour.status !== '작성 중' && <a className="button-link" href="#tours">내 투어 보기</a>}
      </li>
    </ol>
  </>;
}

function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1));
  const [supplier, updateSupplier] = useDraft('actour-supplier-v1', initialSupplier);
  const [tour, updateTour] = useDraft('actour-tour-v1', initialTour);
  const [files, setFiles] = useState({});
  const [images, setImages] = useState(() => tour.sampleImages || []);
  const [formVersion, setFormVersion] = useState(0);
  const approved = supplier.status === '승인';
  const view = !approved ? 'supplier' : ['supplier', 'tour', 'tours'].includes(route) ? route : 'home';
  const viewTitle = { supplier: approved ? '공급자 정보' : '공급자 신청', tour: '투어 게시 신청', tours: '내 투어', home: '홈' }[view];
  const canLoadExample = (view === 'supplier' && supplier.status === '작성 중') || (view === 'tour' && tour.status === '작성 중');

  function updateImages(next) {
    setImages(next);
    updateTour({ sampleImages: next.filter((url) => samplePhotos.includes(url)) });
  }

  useEffect(() => {
    const navigate = () => setRoute(location.hash.slice(1));
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  function demo(action) {
    if (action === 'supplier') {
      updateSupplier({ status: '승인' });
      location.hash = 'home';
    }
    if (action === 'publish') updateTour({ status: '게시 승인' });
    if (action === 'revision') updateTour({ status: '수정 요청' });
  }

  function loadExample() {
    if (view === 'supplier') {
      updateSupplier({ ...initialSupplier, name: '김민지', email: 'minji@example.com', phone: '090-0000-0000', city: '오사카', language: '한국어', sales: '개인 직접 판매', scope: '관광 안내만', work: '체류자격·허가 확인 필요', credential: '자격 표시 안 함' });
      setFiles({ residence: '유료활동범위_샘플.pdf' });
    } else {
      updateTour({ ...initialTour, title: '도톤보리 골목 미식 도보 투어', city: '오사카', language: '한국어', duration: '2시간 30분', meeting: '닛폰바시 역 2번 출구', schedule: '매주 토요일 10:00', scope: '없음', stops: ['구로몬 시장', '도톤보리', '호젠지 요코초'], pricing: '4000', onSite: '600', onSiteDetails: '시식 체험비 ¥600', included: '한국어 가이드, 시식 1인분', excluded: '', refund: '투어 시작 24시간 전까지 전액 환불', tip: '없음', options: '있음', optionDetails: '기본 시식 외 추가 주문은 메뉴 가격에 따라 개인 결제', shopping: '없음' });
      updateImages(samplePhotos);
    }
    setFormVersion((version) => version + 1);
  }

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href={approved ? '#home' : '#supplier'}>ACTOUR <small>가이드 콘솔</small></a>
      <nav aria-label="가이드 콘솔 메뉴">
        {approved && <>
          <a href="#home" aria-current={view === 'home' ? 'page' : undefined}><img src="/design/home.svg" alt="" />홈</a>
          <a href="#tours" aria-current={['tours', 'tour'].includes(view) ? 'page' : undefined}><img src="/design/ticket.svg" alt="" />내 투어</a>
        </>}
        <a href="#supplier" aria-current={view === 'supplier' ? 'page' : undefined}><img src="/design/user.svg" alt="" />{approved ? '공급자 정보' : '공급자 신청'}</a>
      </nav>
    </aside>
    <main>
      <div className="toolbar"><span>가이드 콘솔 <span className="slash">/</span> {viewTitle}</span>
        <div><span className="demo-label">데모</span> {canLoadExample && <button type="button" onClick={loadExample}>예시 입력</button>}</div></div>
      <div className="content">
        {view === 'supplier' && <Supplier key={formVersion} data={supplier} update={updateSupplier} files={files} setFiles={setFiles} demo={demo} />}
        {view === 'tour' && <><a className="back-link" href="#tours">← 내 투어</a>
          <Tour key={formVersion} data={tour} update={updateTour} supplier={supplier} images={images} setImages={updateImages} demo={demo} /></>}
        {['home', 'tours'].includes(view) && <Dashboard supplier={supplier} tour={tour} image={images[0]} view={view} />}
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
