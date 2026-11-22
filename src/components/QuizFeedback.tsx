import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { AppQuestion } from '../core/types';
import type { RoundResult } from '../core/round';
import { C, R } from '../ui/theme';
import { GrainBurst,Pop } from './art';
export function QuizFeedback({
  question: q,
  result: r,
  onNext,
  onExpand,
  onToggleStar,
  onReport,
  starred = false,
  disabled = false,
  retryCorrect
}: {
  question: AppQuestion;
  result: RoundResult;
  onNext(): void;
  onExpand(): void;
  onToggleStar?(): void;
  onReport?(): void;
  starred?: boolean;
  disabled?: boolean;
  retryCorrect?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return <View style={{
    padding: 18,
    gap: 10,
    borderRadius: R.card,
    backgroundColor: r.correct ? C.goodSoft : C.badSoft
  }}>
    <GrainBurst trigger={r.correct?r.grains:0}/>
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: '800',
        color: r.correct ? C.good : C.bad
      }}>{r.correct ? '정답!' : r.timedOut ? '시간 초과' : r.gaveUp ? '모르겠어요' : '아쉬워요'}</Text>
      {r.correct && r.grains > 0 && <Pop trigger={r.grains}><Text style={{
        color: C.grainDeep
      }}>+{r.grains}</Text></Pop>}
      {onToggleStar && <Pressable onPress={onToggleStar} accessibilityRole="button" accessibilityLabel={starred ? '담기 취소' : '담기'} hitSlop={12} style={{
        marginLeft: 'auto',
        padding: 8
      }}><Text style={{
          color: C.grain,
          fontSize: 26
        }}>{starred ? '★' : '☆'}</Text></Pressable>}
    </View>
    {!r.correct && <Text style={{
      fontSize: 18,
      fontWeight: '700',
      color: C.ink
    }}>정답: {q.answer}</Text>}
    {retryCorrect !== undefined && <Text style={{
      color: C.sub
    }}>{retryCorrect ? '도움받아 해결했어요. 최초 답은 복습 기록에 남겨요.' : '다시 생각해 봤어요. 정답과 해설을 확인해요.'}</Text>}
    {r.synonymHit && <Text style={{
      color: C.sub
    }}>비슷한 뜻이지만 여기서 찾는 말은 '{q.answer}'입니다</Text>}
    {!!q.explain && <>
      <Text numberOfLines={expanded ? undefined : 4} style={{
        fontSize: 15,
        lineHeight: 23,
        color: C.sub
      }}>{q.explain}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{
        expanded
      }} onPress={() => {
        setExpanded(v => !v);
        onExpand();
      }} style={{
        paddingVertical: 10
      }}><Text style={{
          color: C.accent
        }}>{expanded ? '해설 접기' : '해설 더 보기'}</Text></Pressable>
    </>}
    {onReport && <Pressable accessibilityRole="link" onPress={onReport} style={{
      paddingVertical: 10
    }}><Text style={{
        color: C.sub
      }}>문제가 이상해요</Text></Pressable>}
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityState={{
      disabled
    }} onPress={onNext} style={{
      padding: 16,
      backgroundColor: C.ink,
      borderRadius: R.button,
      opacity: disabled ? 0.5 : 1
    }}><Text style={{
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '800',
        color: C.grainLight
      }}>다음 문제</Text></Pressable>
  </View>;
}
