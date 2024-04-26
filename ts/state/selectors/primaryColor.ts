import type { PrimaryColorStateType } from '../../themes/constants/colors';
import type { StateType } from '../reducer';

export const getPrimaryColor = (state: StateType): PrimaryColorStateType => state.primaryColor;
