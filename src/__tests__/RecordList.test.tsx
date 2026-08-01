import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecordList } from "@/components/RecordList";
import type { ManualEntryRecord } from "@/types";

const mockRecords: ManualEntryRecord[] = [
  {
    id: 1,
    server_name: "かえで",
    potential_type: "potential",
    cube_type: "neo",
    grade_before: "rare",
    grade_after: "epic",
    quantity_used: 5,
    is_miracle_time: false,
    character_name: null,
    timestamp: 1700000000000,
  },
  {
    id: 2,
    server_name: "ゆかり",
    potential_type: "additional_potential",
    cube_type: "neo_additional",
    grade_before: "unique",
    grade_after: "legendary",
    quantity_used: 3,
    is_miracle_time: true,
    character_name: "さくら",
    timestamp: 1700100000000,
  },
  {
    id: 3,
    server_name: "くるみ",
    potential_type: "potential",
    cube_type: "mega",
    grade_before: "epic",
    grade_after: "unique",
    quantity_used: 10,
    is_miracle_time: false,
    character_name: null,
    timestamp: 1700200000000,
  },
];

describe("Phase1: RecordList", () => {
  describe("レコード一覧表示", () => {
    it("RecordList がレンダリングされること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getByTestId("record-list")).toBeInTheDocument();
    });

    it("3件のレコードが渡された場合、3行が表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      const rows = screen.queryAllByTestId(/record-row-/);
      expect(rows).toHaveLength(3);
    });

    it("レコードが空の場合「データがありません」が表示されること", () => {
      render(<RecordList records={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.queryByText(/ありません/)).toBeInTheDocument();
    });

    it("各行にサーバー名が表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.queryByText(/かえで/)).toBeInTheDocument();
      expect(screen.queryByText(/ゆかり/)).toBeInTheDocument();
      expect(screen.queryByText(/くるみ/)).toBeInTheDocument();
    });

    it("各行に潜在能力種別が表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getAllByText(/潜在能力/).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.queryByText(/アディショナル潜在能力/),
      ).toBeInTheDocument();
    });

    it("各行にキューブ種類が表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.queryByText(/ネオキューブ/)).toBeInTheDocument();
      expect(screen.queryByText(/メガキューブ/)).toBeInTheDocument();
      expect(
        screen.queryByText(/ネオアディショナルキューブ/),
      ).toBeInTheDocument();
    });

    it("各行に等級遷移が表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      // Grade transition is computed as 1 (rare→epic), 2 (epic→unique), 3 (unique→legendary)
      // Default sort is timestamp descending, so order is: record 3 (newest), record 2, record 1 (oldest)
      // record 3: epic→unique = 2
      // record 2: unique→legendary = 3
      // record 1: rare→epic = 1
      const rows = screen.queryAllByTestId(/record-row-/);
      expect(rows[0].textContent).toContain("2"); // record 3: epic→unique = 2
      expect(rows[1].textContent).toContain("3"); // record 2: unique→legendary = 3
      expect(rows[2].textContent).toContain("1"); // record 1: rare→epic = 1
    });
  });

  describe("編集", () => {
    it("各行に編集ボタンが表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      const editButtons = screen.getAllByText(/編集/);
      expect(editButtons).toHaveLength(mockRecords.length);
    });

    it("編集ボタンを押すと onEdit(id) が呼ばれること", () => {
      const onEdit = vi.fn();
      render(
        <RecordList
          records={mockRecords}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />,
      );
      const editButtons = screen.getAllByText(/編集/);
      fireEvent.click(editButtons[1]);
      expect(onEdit).toHaveBeenCalledWith(2);
    });
  });

  describe("削除", () => {
    it("各行に削除ボタンが表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      const deleteButtons = screen.getAllByText(/削除/);
      expect(deleteButtons).toHaveLength(mockRecords.length);
    });

    it("削除ボタンを押すと onDelete(id) が呼ばれること", () => {
      const onDelete = vi.fn();
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />,
      );
      const deleteButtons = screen.getAllByText(/削除/);
      fireEvent.click(deleteButtons[0]);
      expect(onDelete).toHaveBeenCalledWith(3);
    });
  });

  describe("ソート順", () => {
    it("タイムスタンプの降順（新しい順）で表示されること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      const rows = screen
        .queryAllByTestId(/record-row-/)
        .map((row) => row.textContent);
      expect(rows[0]).toContain("1700200000000");
      expect(rows[1]).toContain("1700100000000");
      expect(rows[2]).toContain("1700000000000");
    });
  });

  describe("テーブル構造", () => {
    it("table要素が存在すること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.queryByRole("table")).toBeInTheDocument();
    });

    it("列見出しが複数存在すること", () => {
      render(
        <RecordList
          records={mockRecords}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(
        screen.queryAllByRole("columnheader").length,
      ).toBeGreaterThanOrEqual(5);
    });
  });
});