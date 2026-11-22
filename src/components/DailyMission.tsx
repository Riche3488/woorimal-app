import { Pressable, Text, View } from 'react-native';
import { C, paperCard, R } from '../ui/theme';
import { Pop } from './art';
export function DailyMission({
  progress,
  due,
  tomorrow,
  onStart,
  quickCount = 5
}: {
  progress: {
    learned: number;
    milestones: number;
    complete: boolean;
    migratedComplete?: boolean;
  };
  due: number;
  tomorrow: number;
  onStart(): void;
  quickCount?: number;
}) {
  return <Pop trigger={progress.learned}><View style={{
      ...paperCard,
      padding: 18,
      gap: 12
    }}>
    <Text style={{
        fontSize: 19,
        fontWeight: '800',
        color: C.ink
      }}>오늘의 곳간 키우기</Text>
    <Text style={{
        color: C.sub
      }}>{progress.migratedComplete ? '기존 학습으로 오늘 목표를 달성했어요' : `오늘 ${Math.min(5, progress.learned)}/5개 · 목표 ${progress.milestones}/3단계`}</Text>
    <Text accessibilityLabel={`목표 ${progress.milestones}/3단계`} style={{
        fontSize: 20,
        color: C.grainDeep
      }}>{[0, 1, 2].map(i => i < progress.milestones ? '●' : '○').join(' ')}</Text>
    <Text style={{
        color: C.sub,
        fontSize: 13
      }}>퀴즈·카드·퍼즐을 합쳐 서로 다른 5개를 공부해요.</Text>
    {progress.complete ? <Text style={{
        color: C.good,
        fontWeight: '700'
      }}>오늘 목표 달성! 내일 또 만나요</Text> : <Pressable accessibilityRole="button" onPress={onStart} style={{
        padding: 16,
        borderRadius: R.button,
        backgroundColor: C.ink
      }}><Text style={{
          color: C.grainLight,
          fontWeight: '800',
          textAlign: 'center'
        }}>{due ? `복습 ${Math.min(3, due)}개 시작` : quickCount ? `가볍게 ${quickCount}문제` : '한 판 시작'}</Text></Pressable>}
    <Text style={{
        color: C.sub
      }}>내일 복습 {tomorrow}개</Text>
  </View></Pop>;
}
