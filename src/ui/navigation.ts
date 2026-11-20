// 화면 이동 공통. 홈은 스택 맨 아래에 이미 있으므로 replace('/')로 새로 쌓지 않고 그 홈으로 돌아간다.
// (replace는 홈을 판마다 하나씩 더 쌓아, 멈춘 홈 영상 플레이어가 늘면서 영상·그림이 멈추거나 안 보였다.)
import { router } from 'expo-router';

export const goHome = () => router.dismissTo('/');
