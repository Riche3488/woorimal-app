import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TYPE_LABELS } from '../core/labels';
import type { Round } from '../core/round';
import { createSession, policyFor, type SessionSnapshot } from '../core/session';
import { correctInput, wrongInput } from '../core/testmode';
import { timeLimitMs } from '../core/timing';
import type { AnswerInput, AppQuestion } from '../core/types';
import { usePlaySession } from '../state/usePlaySession';
import { C, paperCard, R, T } from '../ui/theme';
import { ChoiceAnswer, SpacingAnswer, TypedAnswer } from './answers';
import { Hearts, SourceNote, TimerBar } from './bits';
import { QuizFeedback } from './QuizFeedback';
import { spacingGaps } from '../core/grading';
import { spacingFeedback } from '../core/spacing-feedback';

export const FEEDBACK_MS=3000;
type Props={questions:AppQuestion[];onFinish(round:Round):void|Promise<void>;initialSession?:SessionSnapshot;onCheckpoint?(s:SessionSnapshot):Promise<void>;onExit?():void;
  haptics?:boolean;testMode?:boolean;hearts?:number;showHearts?:boolean;autoAdvanceCorrect?:boolean;starred?(key:string):boolean;onToggleStar?(key:string):void;onReport?(q:AppQuestion):void};
export function PlayScreen({questions,onFinish,initialSession,onCheckpoint,onExit,haptics=true,testMode=false,hearts,showHearts=true,autoAdvanceCorrect=false,starred,onToggleStar,onReport}:Props) {
  const [initial]=useState(() => initialSession ?? createSession(questions,{mode:showHearts?'normal':'challenge',day:'2000-01-01',packVersion:'local',rulesVersion:'1'},Date.now(),'local',{
    ...policyFor(showHearts?'normal':'challenge',{autoAdvanceCorrect}),...(hearts === undefined?{}:{hearts})}));
  const control=usePlaySession(initial,onCheckpoint);
  const {session,dispatch,saveStatus}=control, {round,phase}=session;
  const finished=useRef(false), lastHaptic=useRef(initial.round.results.length);
  const [finishError,setFinishError]=useState(false);
  const q=round.questions[phase==='question'?round.index:Math.max(0,round.index-1)];
  const last=round.results.at(-1);
  const wrongPositions=q?.kind==='spacing' && last && phase!=='question'?spacingFeedback(spacingGaps(last.userAnswer).gaps,q.answers??[q.answer]).wrongIndices:[];
  useEffect(() => {
    if (round.results.length>lastHaptic.current) {
      lastHaptic.current=round.results.length;
      if (haptics) void Haptics.notificationAsync(last?.correct?Haptics.NotificationFeedbackType.Success:Haptics.NotificationFeedbackType.Error).catch(()=>{});
    }
  },[round.results.length,haptics,last?.correct]);
  useEffect(() => {
    if (phase==='ready-to-finish' && saveStatus==='saved' && !session.paused && !finished.current && !finishError) {
      finished.current=true;
      Promise.resolve(onFinish(round)).catch(()=>{finished.current=false;setFinishError(true);});
    }
  },[phase,saveStatus,session.paused,onFinish,round,finishError]);
  const exit=useCallback(() => {
    dispatch({kind:'pause'});
    Alert.alert('잠시 멈출까요?','저장한 곳에서 이어 풀 수 있어요.',[
      {text:'계속 풀기',style:'cancel',onPress:()=>dispatch({kind:'resume'})},
      {text:'멈추고 홈으로',onPress:()=>{void control.pauseAndSave().then(onExit).catch(()=>{});}},
    ],{cancelable:false});
  },[dispatch,control.pauseAndSave,onExit]);
  useEffect(()=>{
    if (!onExit) return;
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{exit();return true;});
    return ()=>sub.remove();
  },[onExit,exit]);
  const cancel=()=>dispatch({kind:'cancelAutoAdvance'});
  const submit=(input:AnswerInput)=>dispatch({kind:'answer',input,answeredAt:Date.now()});
  if (!q) return null;
  return <View style={s.screen}>
    <View style={s.top}>
      {showHearts && round.hearts!==null?<Hearts hearts={round.hearts}/>:<Text style={s.progress}>{session.context.mode==='challenge'?'오늘의 문제':'차근차근 학습'}</Text>}
      <Text style={s.progress}>{Math.min(round.index+(phase==='question'?1:0),questions.length)} / {questions.length}</Text>
      <Text style={s.progress}>예상 낱알 {round.grains}</Text>
    </View>
    {session.policy.timed && phase==='question' && !session.paused && <><TimerBar ratio={Math.max(0,1-session.questionElapsedMs/timeLimitMs(q))}/><Text accessibilityLiveRegion="none" style={s.time}>{Math.ceil(Math.max(0,timeLimitMs(q)-session.questionElapsedMs)/1000)}초 남음</Text></>}
    {onExit && <Pressable accessibilityRole="button" onPress={exit} style={s.small}><Text style={s.link}>잠시 멈추기</Text></Pressable>}
    {saveStatus==='error' && <View accessibilityRole="alert" style={s.notice}><Text>저장하지 못했어요</Text><Pressable accessibilityRole="button" onPress={()=>{void control.retrySave().catch(()=>{});}}><Text style={s.link}>다시 저장</Text></Pressable></View>}
    {finishError && <View accessibilityRole="alert" style={s.notice}><Text>결과를 저장하지 못했어요</Text><Pressable onPress={()=>setFinishError(false)} accessibilityRole="button"><Text>다시 시도</Text></Pressable></View>}
    {session.paused?<View style={s.paused}><Text style={s.prompt}>잠시 멈췄어요</Text><Text>입력과 남은 시간을 이어갈 수 있어요.</Text><Pressable accessibilityRole="button" onPress={()=>dispatch({kind:'resume'})} style={s.button}><Text style={s.buttonText}>이어서 풀기</Text></Pressable></View>:
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <Text style={s.link}>{TYPE_LABELS[q.type]}{q.label?` · ${q.label}`:''}</Text>
      <View style={s.card}><Text style={s.prompt}>{q.prompt}</Text><SourceNote source={q.source}/></View>
      {!!wrongPositions.length && <View style={s.notice}><Text>틀린 자리: {wrongPositions.map(i=>`${i+1}번째 글자 뒤`).join(', ')}</Text><Text>표시한 자리의 띄어쓰기를 다시 확인해 보세요.</Text></View>}
      {testMode && phase==='question' && <View style={s.notice}><Text>테스트 · 정답: {q.answer}</Text>
        <Pressable onPress={()=>submit(correctInput(q))}><Text>정답 제출</Text></Pressable><Pressable onPress={()=>submit(wrongInput(q))}><Text>오답 제출</Text></Pressable>
        <Pressable onPress={()=>dispatch({kind:'tick',deltaMs:timeLimitMs(q)+1,answeredAt:Date.now()})}><Text>시간 초과로 넘기기</Text></Pressable></View>}
      {(phase==='question' || phase==='retry') && <View key={`${q.key}-${phase}`}>
        {phase==='retry' && <Text style={s.prompt}>아쉬워요. 한 번 더 생각해 볼까요?</Text>}
        {q.kind==='choice' && <ChoiceAnswer choices={q.choices??[]} disabled={saveStatus==='error'} onPick={input=>phase==='retry'?dispatch({kind:'retry',input}):submit(input)}/>}
        {q.kind==='typed' && <TypedAnswer chosung={q.hint?.chosung} value={typeof session.draft==='string'?session.draft:''} onChange={input=>dispatch({kind:'draft',input})} disabled={saveStatus==='error'} onSubmit={input=>phase==='retry'?dispatch({kind:'retry',input}):submit(input)}/>}
        {q.kind==='spacing' && <SpacingAnswer syllables={q.syllables??[]} value={Array.isArray(session.draft)?session.draft:undefined} onChange={input=>dispatch({kind:'draft',input})} disabled={saveStatus==='error'} onSubmit={input=>phase==='retry'?dispatch({kind:'retry',input}):submit(input)}/>}
        <Pressable style={s.small} disabled={saveStatus!=='saved'} accessibilityRole="button" onPress={()=>phase==='retry'?dispatch({kind:'reveal'}):dispatch({kind:'giveup',answeredAt:Date.now()})}><Text style={s.link}>{phase==='retry'?'정답 보기':'모르겠어요'}</Text></Pressable>
      </View>}
      {(phase==='feedback' || phase==='ready-to-finish') && last && <QuizFeedback key={q.key} question={q} result={last} retryCorrect={session.retryCorrect} disabled={saveStatus!=='saved' || phase==='ready-to-finish'} onNext={()=>dispatch({kind:'next'})} onExpand={cancel}
        starred={starred?.(q.key)} onToggleStar={onToggleStar?()=>{cancel();onToggleStar(q.key);}:undefined} onReport={onReport?()=>{cancel();onReport(q);}:undefined}/>}
      {saveStatus==='saving' && <Text style={s.time}>저장 중…</Text>}
    </ScrollView>}
  </View>;
}
const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:C.bg,padding:18},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},progress:{...T.num,fontSize:14,color:C.sub},
  time:{fontSize:12,color:C.sub,textAlign:'right',marginTop:4},body:{paddingVertical:16,gap:16},card:{...paperCard,padding:22},prompt:{fontSize:20,lineHeight:31,color:C.ink,fontWeight:'600'},
  link:{fontSize:14,color:C.accent,fontWeight:'700'},small:{paddingVertical:12,alignSelf:'center'},notice:{padding:16,gap:10,backgroundColor:C.grainSoft,borderRadius:R.card},
  paused:{flex:1,justifyContent:'center',gap:20},button:{backgroundColor:C.ink,padding:18,borderRadius:R.button,alignItems:'center'},buttonText:{color:C.grainLight,fontSize:18,fontWeight:'800'},
});
