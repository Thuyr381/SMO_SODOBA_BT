// src/features/floorplan/components/FloorBlueprint.tsx
import React from 'react';
import { TableItem, TableStatusClass, ActionMode } from '../../../types';
import { STATUS_COLORS } from '../../../config/constants';
import { TableCard } from './TableCard';
import { Check, Lock } from 'lucide-react';

export interface CustomTableBadge {
  label: string;
  bg: string;
  text: string;
}

interface FloorBlueprintProps {
  tables: TableItem[];
  statusMap: Record<string, TableStatusClass>;
  selectedTables: Set<string>;
  onToggleTable: (tableId: string) => void;
  actionMode?: ActionMode;
  customerMap?: Record<string, string>;
  matchingTableIds?: Set<string>;
  isTableDisabled?: (tableId: string, status: TableStatusClass) => boolean;
  customBadges?: Record<string, CustomTableBadge>;
  compact?: boolean;
}

export const FloorBlueprint: React.FC<FloorBlueprintProps> = ({
  tables,
  statusMap,
  selectedTables,
  onToggleTable,
  actionMode,
  customerMap = {},
  matchingTableIds = new Set(),
  isTableDisabled,
  customBadges = {},
  compact = false,
}) => {
  const getTable = (id: string) => tables.find((t) => t.id === id);

  const renderTable = (id: string, customClass = '') => {
    const tbl = getTable(id);
    if (!tbl) return <div className="w-full h-8" />;
    const currentStatus =
      statusMap[tbl.id] ||
      (tbl.cellId ? statusMap[tbl.cellId] : undefined) ||
      tbl.status ||
      'empty';
    const isSelected = selectedTables.has(tbl.id);
    const isSearchMatched = matchingTableIds.has(tbl.id) || (tbl.cellId ? matchingTableIds.has(tbl.cellId) : false);
    const customer = customerMap[tbl.id] || (tbl.cellId ? customerMap[tbl.cellId] : undefined);
    const isDisabled = isTableDisabled ? isTableDisabled(tbl.id, currentStatus) : undefined;
    const badge = customBadges[tbl.id] || (tbl.cellId ? customBadges[tbl.cellId] : undefined);

    return (
      <TableCard
        key={tbl.id}
        table={tbl}
        status={currentStatus}
        isSelected={isSelected}
        actionMode={actionMode}
        bookingCustomerName={customer}
        isSearchMatched={isSearchMatched}
        onToggleSelect={onToggleTable}
        customClass={customClass}
        disabled={isDisabled}
        customBadge={badge}
      />
    );
  };

  // Helper for VIP1 (Lầu 2A)
  const vip1Table = getTable('VIP1');
  const vip1Status = statusMap['VIP1'] || vip1Table?.status || 'empty';
  const isVip1Selected = selectedTables.has('VIP1');
  const isVip1SearchMatched = matchingTableIds.has('VIP1');
  const isVip1Disabled = isTableDisabled ? isTableDisabled('VIP1', vip1Status) : false;
  const vip1Badge = customBadges['VIP1'];
  const vip1Colors = STATUS_COLORS[vip1Status] || STATUS_COLORS.empty;

  // Helper for VIP2 (Lầu 2B)
  const vip2Table = getTable('VIP2');
  const vip2Status = statusMap['VIP2'] || vip2Table?.status || 'empty';
  const isVip2Selected = selectedTables.has('VIP2');
  const isVip2SearchMatched = matchingTableIds.has('VIP2');
  const isVip2Disabled = isTableDisabled ? isTableDisabled('VIP2', vip2Status) : false;
  const vip2Badge = customBadges['VIP2'];
  const vip2Colors = STATUS_COLORS[vip2Status] || STATUS_COLORS.empty;

  return (
    <div
      id="floor-blueprint-container"
      className={`w-full ${compact ? 'min-w-[436px] max-w-[436px]' : 'min-w-[436px] max-w-[460px] sm:max-w-[490px]'} border-2 border-black bg-white shadow-2xl rounded-sm overflow-hidden text-black font-sans select-none mx-auto`}
    >
      {/* 1. Header: ĐƯỜNG THOẠI NGỌC HẦU */}
      <div
        id="blueprint-banner-thoai-ngoc-hau"
        className="w-full bg-[#d0d7de] border-b border-black py-1 px-2 text-center font-black text-xs sm:text-sm tracking-wider uppercase"
      >
        ĐƯỜNG THOẠI NGỌC HẦU
      </div>

      {/* 2. Header: Bãi xe */}
      <div
        id="blueprint-banner-bai-xe"
        className="w-full bg-[#eeeeee] border-b border-black py-0.5 text-center font-bold text-xs sm:text-sm"
      >
        Bãi xe
      </div>

      {/* 3. Main Floor Area: Left Vertical VIP1 + Green Garden Zone + Ground Floor Hall */}
      <div className="flex w-full items-stretch border-b border-black">
        {/* A. Left Vertical Bar: LẦU 2A ( VIP1: 50kh ) */}
        <button
          type="button"
          id="table-blueprint-VIP1"
          onClick={() => !isVip1Disabled && onToggleTable('VIP1')}
          disabled={isVip1Disabled}
          style={{
            backgroundColor: vip1Badge?.bg || vip1Colors.bg,
            color: vip1Badge?.text || vip1Colors.text,
            borderColor: isVip1Selected ? '#d32f2f' : isVip1SearchMatched ? '#f59e0b' : '#222222',
          }}
          title={`LẦU 2A ( VIP1: 50 khách ) - Karaoke & Máy lạnh${vip1Badge ? ` [${vip1Badge.label}]` : ''}`}
          className={`w-10 sm:w-11 shrink-0 border-r border-black flex items-center justify-center relative overflow-hidden p-1 transition-all ${
            isVip1Disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
          } ${
            isVip1Selected
              ? 'table-selected-blink ring-2 ring-red-600 z-20 font-black'
              : isVip1SearchMatched
              ? 'ring-2 ring-amber-400 z-10 animate-pulse font-black'
              : ''
          }`}
        >
          {vip1Badge && (
            <span
              className="absolute top-1 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded text-[7px] font-black uppercase shadow tracking-wider z-20 whitespace-nowrap"
              style={{ backgroundColor: vip1Badge.bg, color: vip1Badge.text, border: '1px solid black' }}
            >
              {vip1Badge.label}
            </span>
          )}
          {isVip1Selected && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow border border-white text-[9px] font-black z-30">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          {isVip1SearchMatched && !isVip1Selected && (
            <span className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow text-[8px] font-black z-20">
              ★
            </span>
          )}
          {vip1Status === 'inactive' && !vip1Badge && (
            <span className="absolute top-1 left-1 opacity-80">
              <Lock className="w-2.5 h-2.5 text-zinc-300" />
            </span>
          )}
          <span
            className="font-bold text-[11px] sm:text-xs tracking-tight text-center whitespace-nowrap block"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            LẦU 2A ( VIP1: 50kh )
          </span>
        </button>

        {/* Thin Gray Strip */}
        <div className="w-2 sm:w-2.5 shrink-0 bg-[#9e9e9e] border-r border-black" />

        {/* B. Green Garden Zone (Khu vực Xanh - Bàn 51 đến 64) */}
        <div
          id="blueprint-green-garden-zone"
          className="w-[105px] sm:w-[115px] shrink-0 bg-[#c8e6c9] border-r border-black p-1.5 flex flex-col justify-between"
        >
          {/* Top row in green: 56 & 57 */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {renderTable('56')}
            {renderTable('57')}
          </div>

          {/* Row 2 in green: 55 & 58 */}
          <div className="grid grid-cols-2 gap-1.5">
            {renderTable('55')}
            {renderTable('58')}
          </div>

          {/* Row 3 in green: 54 & 59 */}
          <div className="grid grid-cols-2 gap-1.5">
            {renderTable('54')}
            {renderTable('59')}
          </div>

          {/* Row 4 in green: 53 & 60 */}
          <div className="grid grid-cols-2 gap-1.5">
            {renderTable('53')}
            {renderTable('60')}
          </div>

          {/* Row 5 in green: 52 & 61 */}
          <div className="grid grid-cols-2 gap-1.5">
            {renderTable('52')}
            {renderTable('61')}
          </div>

          {/* Row 6 in green: 51 & 62 */}
          <div className="grid grid-cols-2 gap-1.5">
            {renderTable('51')}
            {renderTable('62')}
          </div>

          {/* Row 7 in green: Empty & 63 */}
          <div className="grid grid-cols-2 gap-1.5">
            <div />
            {renderTable('63')}
          </div>

          {/* Row 8 in green: Empty & 64 */}
          <div className="grid grid-cols-2 gap-1.5 pb-1">
            <div />
            {renderTable('64')}
          </div>
        </div>

        {/* C. Ground Floor Hall (Khu vực Trệt - Bàn 1-47, Sân khấu) */}
        <div
          id="blueprint-ground-floor-zone"
          className="flex-1 min-w-[268px] bg-[#fff9c4] p-1.5 flex flex-col justify-between gap-1.5"
        >
          {/* Row 0: Top right row (47, 46, 45, 44) - Căn thẳng hàng với các bàn bên phải, chừa lối đi thẳng */}
          <div className="flex items-center justify-between">
            <div className="w-[68px] sm:w-[76px] shrink-0" />
            {/* Lối đi thẳng phía trên */}
            <div className="w-6 sm:w-7 shrink-0" />
            <div className="flex gap-1 justify-end flex-1">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('47')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('46')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('45')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('44')}</div>
            </div>
          </div>

          {/* Row 1: [7, 6] --- LỐI ĐI THẲNG --- [5, 4, 3, 2, 1] */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 w-[68px] sm:w-[76px] shrink-0 justify-start">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('7')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('6')}</div>
            </div>
            {/* Lối đi thẳng giữa Bàn 6 và Bàn 5 */}
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center pointer-events-none">
              <span className="hidden sm:inline text-[8px] font-black text-amber-700/40 uppercase tracking-widest -rotate-90 select-none">
                LỐI ĐI
              </span>
            </div>
            <div className="flex gap-1 justify-end flex-1">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('5')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('4')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('3')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('2')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('1')}</div>
            </div>
          </div>

          {/* Row 2: [8, 9] --- LỐI ĐI THẲNG --- [10, 11, 12, 13, 14] */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 w-[68px] sm:w-[76px] shrink-0 justify-start">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('8')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('9')}</div>
            </div>
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center pointer-events-none" />
            <div className="flex gap-1 justify-end flex-1">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('10')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('11')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('12')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('13')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('14')}</div>
            </div>
          </div>

          {/* Row 3: [21, 20] --- LỐI ĐI THẲNG --- [19, 18, 17, 16, 15] */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 w-[68px] sm:w-[76px] shrink-0 justify-start">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('21')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('20')}</div>
            </div>
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center pointer-events-none" />
            <div className="flex gap-1 justify-end flex-1">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('19')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('18')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('17')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('16')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('15')}</div>
            </div>
          </div>

          {/* Row 4: [22, 23] --- LỐI ĐI THẲNG --- [ SÂN KHẤU ] */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 w-[68px] sm:w-[76px] shrink-0 justify-start">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('22')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('23')}</div>
            </div>
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center pointer-events-none" />
            {/* SÂN KHẤU Box */}
            <div className="flex-1 h-11 bg-[#2b2b2b] border border-black rounded-[2px] flex items-center justify-center shadow-inner">
              <span className="text-[#ffd54f] font-black text-xs sm:text-sm tracking-wider uppercase">
                SÂN KHẤU
              </span>
            </div>
          </div>

          {/* Row 5: [30, 29] --- LỐI ĐI THẲNG --- [28, 27, 26, 25, 24] */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 w-[68px] sm:w-[76px] shrink-0 justify-start">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('30')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('29')}</div>
            </div>
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center pointer-events-none" />
            <div className="flex gap-1 justify-end flex-1">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('28')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('27')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('26')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('25')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('24')}</div>
            </div>
          </div>

          {/* Row 6: [31, 32] --- LỐI ĐI THẲNG --- [33, 34, 35, 36, 37] */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 w-[68px] sm:w-[76px] shrink-0 justify-start">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('31')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('32')}</div>
            </div>
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center pointer-events-none" />
            <div className="flex gap-1 justify-end flex-1">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('33')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('34')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('35')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('36')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('37')}</div>
            </div>
          </div>

          {/* Row 7: [ 43 ] --- LỐI ĐI THẲNG --- [42, 41, 40, 39, 38] */}
          <div className="flex items-center justify-between">
            <div className="w-[68px] sm:w-[76px] shrink-0">{renderTable('43', 'w-full')}</div>
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center pointer-events-none" />
            <div className="flex gap-1 justify-end flex-1">
              <div className="w-8 sm:w-9 shrink-0">{renderTable('42')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('41')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('40')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('39')}</div>
              <div className="w-8 sm:w-9 shrink-0">{renderTable('38')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: WC TRỆT, HÀNH LANG LẦU 1, VIP ROOMS, HÀNH LANG LẦU 2, LẦU 2B */}
      <div className="w-full flex flex-col">
        {/* Row A: WC TRỆT (Orange on left) + Gray on right */}
        <div className="flex w-full border-b border-black">
          <div className="w-[146px] sm:w-[160px] bg-[#f57c00] border-r border-black py-0.5 px-1 text-left font-black text-xs">
            WC TRỆT
          </div>
          <div className="flex-1 bg-[#9e9e9e]" />
        </div>

        {/* Row B: HÀNH LANG, CẦU THANG BỘ, WC LẦU 1 */}
        <div className="w-full bg-[#b0bec5] border-b border-black py-0.5 px-2 font-bold text-[11px] sm:text-xs">
          HÀNH LANG, CẦU THANG BỘ, WC LẦU 1
        </div>

        {/* Row C: VIP Rooms (VIP 70, 72, 74, 76 - 10kh) */}
        <div className="w-full bg-[#c8e6c9] border-b border-black p-1.5 sm:p-2">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-[95%] mx-auto">
            <div className="w-full">{renderTable('VIP70')}</div>
            <div className="w-full">{renderTable('VIP72')}</div>
            <div className="w-full">{renderTable('VIP74')}</div>
            <div className="w-full">{renderTable('VIP76')}</div>
          </div>
        </div>

        {/* Row D: HÀNH LANG, CẦU THANG BỘ, WC LẦU 2 */}
        <div className="w-full bg-[#b0bec5] border-b border-black py-0.5 px-2 font-bold text-[11px] sm:text-xs">
          HÀNH LANG, CẦU THANG BỘ, WC LẦU 2
        </div>

        {/* Row E: LẦU 2B ( VIP2: 80kh ) */}
        <button
          type="button"
          id="table-blueprint-VIP2"
          onClick={() => !isVip2Disabled && onToggleTable('VIP2')}
          disabled={isVip2Disabled}
          style={{
            backgroundColor: vip2Badge?.bg || vip2Colors.bg,
            color: vip2Badge?.text || vip2Colors.text,
            borderColor: isVip2Selected ? '#d32f2f' : isVip2SearchMatched ? '#f59e0b' : '#222222',
          }}
          title={`LẦU 2B ( VIP2: 80 khách ) - Hội trường tiệc lớn${vip2Badge ? ` [${vip2Badge.label}]` : ''}`}
          className={`w-full py-1 text-center font-black text-xs sm:text-sm tracking-wide uppercase transition-all ${
            isVip2Disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
          } ${
            isVip2Selected
              ? 'table-selected-blink ring-2 ring-red-600 font-black'
              : isVip2SearchMatched
              ? 'ring-2 ring-amber-400 font-black animate-pulse'
              : ''
          }`}
        >
          {vip2Badge && (
            <span
              className="mr-2 px-1.5 py-0.2 rounded text-[9px] font-black uppercase shadow tracking-wider whitespace-nowrap"
              style={{ backgroundColor: vip2Badge.bg, color: vip2Badge.text, border: '1px solid black' }}
            >
              {vip2Badge.label}
            </span>
          )}
          LẦU 2B ( VIP2: 80kh )
        </button>
      </div>
    </div>
  );
};
