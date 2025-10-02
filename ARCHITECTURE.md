# アーキテクチャ変更ドキュメント

## 概要

このドキュメントでは、Tauri 2.0 ベースの出席管理ソフトウェアに行った主要なアーキテクチャ変更について説明します。

## 変更の目的

従来の実装では、クライアント側でも同じ Tauri ソフトウェアをインストールする必要があり、複数 PC 接続時の運用が煩雑でした。この変更により、以下の改善を実現します:

1. **クライアント側の簡素化**: ブラウザのみで出席登録が可能
2. **導入の容易さ**: Tauri ソフトはサーバー 1 台のみにインストール
3. **スケーラビリティ**: 複数のクライアントから同時アクセス可能

## アーキテクチャの変更点

### 旧アーキテクチャ

```
[Tauri App (サーバー)] ←→ [Tauri App (クライアント1)]
                      ←→ [Tauri App (クライアント2)]
                      ←→ [Tauri App (クライアント3)]
```

- 全ての PC で Tauri アプリをインストール
- Socket.IO で相互通信

### 新アーキテクチャ

```
[Tauri App (サーバー + モニタ)]
    ├─ Socket.IO Server (Port 12345)
    └─ HTTP Server (Port 8080)
         ├─ attendance.html (静的ファイル)
         └─ その他リソース

[ブラウザ (クライアント1)] ←→ Socket.IO
[ブラウザ (クライアント2)] ←→ Socket.IO
[ブラウザ (クライアント3)] ←→ Socket.IO
```

- Tauri アプリは 1 台のみ（サーバー + モニタ）
- クライアントは任意のブラウザでアクセス
- HTTP サーバーが静的 HTML を配信
- Socket.IO でリアルタイム同期

## 実装詳細

### 1. HTTP サーバーの追加

**ファイル**: `src-tauri/src/socket/server.rs`

```rust
async fn start_http_server(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // 静的ファイルのパスを取得
    let static_dir = // 開発モードとリリースモードで切り替え

    // Axumルーターで静的ファイルを配信
    let app = axum::Router::new()
        .nest_service("/", ServeDir::new(&static_dir))
        .layer(CorsLayer::permissive());

    // ポート8080でHTTPサーバーを起動
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", my_domain, port)).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
```

**特徴**:

- Socket.IO サーバーと並行して動作
- 静的 HTML ファイル（`attendance.html`）を配信
- CORS を許可してクロスオリジンアクセスをサポート

### 2. ブラウザ用出席登録ページ

**ファイル**: `src-tauri/static/attendance.html`

**主要機能**:

- Socket.IO CDN を使用してサーバーに接続
- URL パラメータからイベント UUID とサーバーアドレスを取得
- 学籍番号入力フォーム
- リアルタイム出席状況表示
- 統計情報（出席者数、出席率、当日参加者数）

**使用例**:

```
http://192.168.1.100:8080/attendance.html?uuid=abc123&server=192.168.1.100:12345
```

### 3. Tauri アプリのモニタ専用化

**ファイル**: `src/event/monitor-page.tsx`

**変更内容**:

- 学籍番号入力フォームを削除
- リアルタイムモニタ機能のみを提供
- 出席登録ページへのリンクボタンを追加
- Socket.IO クライアントとしてサーバーに接続
- データのダウンロード機能を保持

**UI 構成**:

- 統計情報カード（出席者数、出席率、当日参加者数）
- 出席者リスト（リアルタイム更新）
- 出席登録ページ URL の表示
- 「出席登録ページを開く」ボタン

### 4. ルーティングの変更

**ファイル**: `src/main.tsx`

```tsx
// 旧: /event/:uuid/:isHost/:domain
// 新: /monitor/:uuid/:domain

const MonitorPage = React.lazy(() => import("./event/monitor-page"));

<Route path="monitor/:uuid/:domain" element={<MonitorPage />} />;
```

### 5. 静的ファイルのバンドル設定

**ファイル**: `src-tauri/tauri.conf.json`

```json
"bundle": {
  "resources": [
    "static/*"
  ]
}
```

これにより、ビルド時に`static`フォルダがバンドルに含まれます。

## データフロー

### イベント作成フロー

```
1. Tauriアプリでイベント作成
2. Rustバックエンドでイベントデータを保存
3. Socket.IOサーバーとHTTPサーバーを起動
4. モニタ画面に出席登録URLを表示
```

### 出席登録フロー

```
1. ブラウザで attendance.html にアクセス
2. Socket.IOでサーバーに接続
3. イベント情報を取得
4. 学籍番号を入力
5. Socket.IOで出席データを送信
6. サーバーが全クライアントに更新を配信
7. モニタ画面とすべてのブラウザが更新
```

## 通信プロトコル

### Socket.IO イベント

**クライアント → サーバー**:

- `join`: イベントに参加（イベントデータを取得）
- `register_attendees`: 出席者を登録
- `register_ontheday`: 当日参加者を登録
- `sync_all_data`: 全データを同期

**サーバー → クライアント**:

- `join_return`: イベントデータを返す
- `register_attendees_return`: 出席者データを配信
- `register_ontheday_return`: 当日参加者データを配信
- `settings_change_return`: 設定変更を配信

## 開発とデプロイ

### 開発モード

```bash
# Tauriアプリの開発サーバーを起動
bun run tauri dev

# 静的ファイルは src-tauri/static/ から配信
```

### リリースビルド

```bash
# フロントエンドとバックエンドをビルド
bun run tauri build

# 静的ファイルは実行ファイルと同じディレクトリの static/ フォルダにバンドル
```

### ディレクトリ構造（リリース後）

```
list-checker-tauri.exe
static/
  └── attendance.html
```

## メリット

1. **クライアント側の簡素化**

   - ブラウザのみで動作
   - Tauri のインストール不要
   - OS に依存しない

2. **運用の容易さ**

   - サーバー 1 台のみセットアップ
   - クライアントは即座にアクセス可能
   - URL を共有するだけで参加可能

3. **スケーラビリティ**

   - 複数クライアントから同時アクセス
   - 各クライアントがリアルタイム同期
   - サーバー負荷の分散

4. **保守性**
   - コードベースの統一
   - サーバー側の更新で全体に反映
   - デバッグが容易

## 注意点

1. **ネットワーク要件**

   - クライアントとサーバーが同じローカルネットワークに接続
   - ファイアウォールでポート 8080 と 12345 を開放

2. **セキュリティ**

   - 現在は認証機能なし（ローカルネットワーク前提）
   - 必要に応じて認証機能を追加可能

3. **互換性**
   - モダンブラウザが必要（Socket.IO 対応）
   - Chrome, Firefox, Safari, Edge など

## 今後の拡張可能性

1. **認証機能**: パスワード保護
2. **QR コード**: 出席登録 URL の QR コード生成
3. **モバイル最適化**: レスポンシブデザインの改善
4. **プッシュ通知**: 新規出席者のリアルタイム通知
5. **データ分析**: 出席傾向の可視化

## まとめ

この変更により、Tauri アプリケーションはサーバー・モニタ専用となり、クライアント側はブラウザベースの軽量なインターフェースに変更されました。これにより、運用の簡素化とスケーラビリティの向上を実現しています。
