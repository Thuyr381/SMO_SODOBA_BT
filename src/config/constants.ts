// src/config/constants.ts
import { TableItem, MasterMenuItem, TableStatusClass } from '../types';

export const API_DATBAN_URL = import.meta.env.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbz_MOCK_SODOBA_S8/exec';

export const STATUS_COLORS: Record<TableStatusClass, { bg: string; text: string; label: string; border: string; badgeBg: string }> = {
  empty: {
    bg: '#fdd835',
    text: '#000000',
    label: 'Trống',
    border: '#212121',
    badgeBg: 'bg-[#fdd835] text-slate-950',
  },
  booked: {
    bg: '#d32f2f',
    text: '#ffffff',
    label: 'Đã đặt',
    border: '#800000',
    badgeBg: 'bg-[#d32f2f] text-white',
  },
  confirmed: {
    bg: '#f57c00',
    text: '#ffffff',
    label: 'Xác nhận',
    border: '#b24a00',
    badgeBg: 'bg-[#f57c00] text-white',
  },
  arrived: {
    bg: '#2e7d32',
    text: '#ffffff',
    label: 'Đã đến',
    border: '#1b5e20',
    badgeBg: 'bg-[#2e7d32] text-white',
  },
  inactive: {
    bg: '#424242',
    text: '#ffffff',
    label: 'Khóa',
    border: '#111111',
    badgeBg: 'bg-[#424242] text-zinc-200',
  },
};

/**
 * Danh sách toàn bộ các bàn Tân Phú (S8) theo đúng sơ đồ chủ SMO
 */
export const INITIAL_TABLES: TableItem[] = [
  // Lầu 2A (VIP1 - 50 khách) - Khối dọc bên trái
  {
    id: 'VIP1',
    cellId: 'VIP1',
    name: 'LẦU 2A ( VIP1: 50kh )',
    capacity: 50,
    status: 'empty',
    zone: 'VIP',
    subZone: 'Lầu 2A',
    note: 'Sức chứa 50 khách - Có Karaoke & Máy lạnh',
  },

  // Khu Vực Xanh (Green Zone): Bàn 51 đến 64
  ...Array.from({ length: 14 }, (_, i) => {
    const num = 51 + i;
    return {
      id: `${num}`,
      cellId: `${num}`,
      name: `${num}`,
      capacity: 4,
      status: 'empty' as TableStatusClass,
      zone: 'GREEN' as const,
      subZone: 'Khu vực Xanh (Sân vườn)',
      note: 'Bàn sân vườn ngoài trời',
    };
  }),

  // Khu vực Trệt - Bàn hàng trên: 47, 46, 45, 44
  ...[47, 46, 45, 44].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: 6,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Hàng trên',
  })),

  // Các hàng bàn chính Khu Vực Trệt
  // Hàng 1: [7, 6] & [5, 4, 3, 2, 1]
  ...[7, 6, 5, 4, 3, 2, 1].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: 4,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Dãy 1',
  })),

  // Hàng 2: [8, 9] & [10, 11, 12, 13, 14]
  ...[8, 9, 10, 11, 12, 13, 14].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: 4,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Dãy 2',
  })),

  // Hàng 3: [21, 20] & [19, 18, 17, 16, 15]
  ...[21, 20, 19, 18, 17, 16, 15].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: 4,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Dãy 3',
  })),

  // Hàng 4: [22, 23] (Bên cạnh SÂN KHẤU)
  ...[22, 23].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: 6,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Khu Sân Khấu',
  })),

  // Hàng 5: [30, 29] & [28, 27, 26, 25, 24]
  ...[30, 29, 28, 27, 26, 25, 24].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: 4,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Dãy 4',
  })),

  // Hàng 6: [31, 32] & [33, 34, 35, 36, 37]
  ...[31, 32, 33, 34, 35, 36, 37].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: 4,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Dãy 5',
  })),

  // Hàng 7: [43] & [42, 41, 40, 39, 38]
  ...[43, 42, 41, 40, 39, 38].map((num) => ({
    id: `${num}`,
    cellId: `${num}`,
    name: `${num}`,
    capacity: num === 43 ? 8 : 4,
    status: 'empty' as TableStatusClass,
    zone: 'GROUND' as const,
    subZone: 'Dãy 6',
  })),

  // Khối VIP Cards Lầu 1: VIP 70, VIP 72, VIP 74, VIP 76 (10 khách/phòng)
  {
    id: 'VIP70',
    cellId: '70',
    name: '70',
    capacity: 10,
    status: 'empty',
    zone: 'VIP',
    subZone: 'Phòng VIP Lầu 1',
    note: '10kh - Phòng riêng máy lạnh',
  },
  {
    id: 'VIP72',
    cellId: '72',
    name: '72',
    capacity: 10,
    status: 'empty',
    zone: 'VIP',
    subZone: 'Phòng VIP Lầu 1',
    note: '10kh - Phòng riêng máy lạnh',
  },
  {
    id: 'VIP74',
    cellId: '74',
    name: '74',
    capacity: 10,
    status: 'empty',
    zone: 'VIP',
    subZone: 'Phòng VIP Lầu 1',
    note: '10kh - Phòng riêng máy lạnh',
  },
  {
    id: 'VIP76',
    cellId: '76',
    name: '76',
    capacity: 10,
    status: 'empty',
    zone: 'VIP',
    subZone: 'Phòng VIP Lầu 1',
    note: '10kh - Phòng riêng máy lạnh',
  },

  // Khối LẦU 2B (VIP2 - 80 khách)
  {
    id: 'VIP2',
    cellId: 'VIP2',
    name: 'LẦU 2B ( VIP2: 80kh )',
    capacity: 80,
    status: 'empty',
    zone: 'VIP',
    subZone: 'Hội trường Lầu 2',
    note: 'Sức chứa 80 khách - Sự kiện, Hội nghị, Tiệc lớn',
  },
];

import { SMO_MASTER_MENUS } from '../data/smoMenuData';

/**
 * Danh mục món ăn thực tế đầy đủ của SMO (MENU_MON / CONFIG_MON)
 */
export const INITIAL_MENU_ITEMS: MasterMenuItem[] = SMO_MASTER_MENUS;

