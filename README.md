# 出席管理システム

読売理工医療福祉専門学校向けの Web 出席管理アプリです。教員が授業ごとに出席・遅刻・欠席を記録し、学生の出席率や電車遅延を参照できます。

**デモ URL:** https://attendance-management-system-plum-theta.vercel.app/

---

## GitHub リポジトリ説明文（About にコピー）

```
専門学校向け出席管理 Web アプリ。React + Supabase + Vercel。出席記録・遅刻判定・電車遅延連携・出席率集計に対応。
```

**Topics（任意）:** `react` `vite` `supabase` `vercel` `attendance` `school`

---

## 主な機能

### 教員
- **出席登録** — 授業の開始・終了、学生のワンクリック出席取り
- **遅刻判定** — 開始 1 分以内＝出席、20 分以内＝遅刻、それ以降＝欠席（電車遅延時は 30 分まで遅刻扱い）
- **電車運行情報** — ODPT API から主要私鉄の運行情報を表示（緑＝平常 / 赤＝遅延）
- **電車遅延モード** — 手動で全員に 21〜30 分遅延を適用
- **学生管理** — 担当授業の学生情報・通勤路線の編集、出席履歴・CSV/JSON エクスポート

### 管理者
- **ダッシュボード** — 本日の出席率、要注意学生、最近の出席記録
- **授業管理** — 授業の追加・編集・削除（時間・曜日）
- **教員管理** — 教員アカウント作成、担当授業の割り当て

### 出席率の計算
- **遅刻 3 回 ＝ 欠席 1 回** として出席率を算出
- 休講日は出席率の分母から除外

---

## 技術スタック

| 区分 | 技術 |
|------|------|
| フロントエンド | React 19, Vite, React Router |
| バックエンド / DB | [Supabase](https://supabase.com/)（Auth + PostgreSQL） |
| ホスティング | [Vercel](https://vercel.com/) |
| 外部 API | ODPT（運行情報）、HeartRails（駅検索） |

---

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR_USERNAME/attendance-management-system.git
cd attendance-management-system
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

| 変数名 | 説明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase プロジェクト URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon（公開）キー |
| `VITE_ODPT_API_KEY` | [ODPT 開発者サイト](https://developer.odpt.org/) で取得した API キー |

### 3. Supabase の初期設定

Supabase ダッシュボードの **SQL Editor** で、順番に実行してください。

1. `supabase/fix-profiles-rls.sql` — プロフィール自動作成・RLS ポリシー
2. `supabase/fix-attendance-duplicates.sql` — 出席の重複防止
3. （既存 DB の場合）`supabase/migrate-all-japanese.sql` — ステータス等の日本語化

**Auth 設定**
- Authentication → Providers → Email を有効化
- **Confirm email** は OFF 推奨（教員はユーザー名ログイン）

**初回管理者の作成**
1. Authentication → Users で管理者ユーザーを追加
2. SQL Editor で `profiles.role` を `admin` に更新

詳細は `supabase/fix-profiles-rls.sql` 内のコメントを参照してください。

### 4. ローカル開発

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

---

## Vercel へのデプロイ

1. GitHub リポジトリを Vercel にインポート
2. Framework Preset: **Vite**
3. 環境変数に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_ODPT_API_KEY` を設定
4. デプロイ

`vercel.json` により、本番環境でも ODPT・HeartRails API へのプロキシが有効になります。

**Supabase の Auth 設定**
- Site URL / Redirect URLs に Vercel の URL を追加

---

## ログイン

| 種別 | 方法 |
|------|------|
| 管理者 | メールアドレス + パスワード |
| 教員 | ユーザー名 + パスワード（内部メール `@teachers.internal` で Auth 連携） |

---

## プロジェクト構成

```
src/
  pages/          # 画面（Home, Login, 出席, 学生, 授業, 教員）
  components/     # Layout, Sidebar, ProtectedRoute など
  context/        # Auth, 出席セッション, 電車遅延
  services/       # ODPT, 駅検索 API
  utils/          # 出席判定, エクスポート, 各種 CRUD
supabase/         # SQL マイグレーション・RLS 設定
vercel.json       # 本番 API プロキシ
```

---

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint |

---

## 既知の制限

- **JR 東日本**のリアルタイム運行情報は ODPT 無料枠では取得できません（手動の電車遅延モードで対応）
- ODPT API キーはフロントエンドに含まれるため、内部利用を想定しています
- モバイル（768px 以下）ではサイドバーが非表示です

---

## ライセンス

Private — 学校内部利用を想定しています。
