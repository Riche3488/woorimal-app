// 이 빌드의 정보. expo-constants가 app.json 값을 빌드에 담는다.
import Constants from 'expo-constants';
import { testModeAllowed } from '../core/app-info';

export const APP_VERSION = Constants.expoConfig?.version ?? '?';

// EXPO_PUBLIC_ 값은 빌드할 때 글자 그대로 바뀌므로 process.env.EXPO_PUBLIC_TEST_MODE로 적어야 한다.
export const TEST_MODE_OK = testModeAllowed(__DEV__, process.env.EXPO_PUBLIC_TEST_MODE);
