import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';
import { GameProvider,useGame,type Game } from '../GameProvider';
import { reduceSession } from '../../core/session';
import type { AppPack } from '../../core/types';
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../data/pack-store',()=>({loadPack:jest.fn(async()=>({schema:1,version:'p',generatedAt:'2026-11-22',counts:{},questions:[{key:'spelling:1',type:'spelling',kind:'choice',prompt:'문제',answer:'가',choices:['가','나'],explain:'설명',source:'original',easy:true}]})),refreshPack:jest.fn(async()=>null)}));
let game:Game;
function Probe(){game=useGame();return <Text>결과 {game.lastRound?.results.length??0}</Text>;}
test('global_retry_of_failed_completion_restores_result_without_recording_twice',async()=>{
  await AsyncStorage.clear();
  await render(<GameProvider><Probe/></GameProvider>);
  await act(async()=>{await game.sessions!.begin('normal');});
  let s=game!.save.activeSession!;
  s=reduceSession(s,{kind:'answer',input:'가',answeredAt:Date.now()});
  await act(async()=>{await game.sessions!.checkpoint(s);});
  s=reduceSession(s,{kind:'next'});
  await act(async()=>{await game.sessions!.checkpoint(s);});
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  await act(async()=>{await expect(game.sessions!.finish(s.id)).rejects.toThrow('disk');});
  expect(screen.getByText('저장하지 못했어요')).toBeTruthy();
  await fireEvent.press(screen.getByText('다시 시도'));
  expect(game!.save.activeSession).toBeNull();
  expect(screen.getByText('결과 1')).toBeTruthy();
  expect(game!.save.progress.stats['spelling:1'].seen).toBe(1);
  expect(game!.save.rounds).toBe(1);
});
