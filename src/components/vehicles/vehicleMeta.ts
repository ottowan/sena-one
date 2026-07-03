import { LuBike, LuCarFront, LuTruck } from 'react-icons/lu';
import { VehicleType } from '../../types';

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
    [VehicleType.PICKUP]: 'รถกระบะ',
    [VehicleType.CAR]: 'รถเก๋ง',
    [VehicleType.MOTORCYCLE]: 'รถมอเตอร์ไซค์',
};

export const VEHICLE_TYPE_ICONS: Record<VehicleType, typeof LuCarFront> = {
    [VehicleType.PICKUP]: LuTruck,
    [VehicleType.CAR]: LuCarFront,
    [VehicleType.MOTORCYCLE]: LuBike,
};
