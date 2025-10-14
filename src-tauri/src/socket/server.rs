use socketioxide::{extract::{Data, SocketRef}, SocketIo};
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use crate::get_app_state;
use crate::get_app_state2;
use crate::get_app_state3;
use crate::get_app_state4;
use local_ip_address::local_ip;
use serde::{ Deserialize, Serialize};
use crate::IS_SERVER_RUNNING;
use chrono::Local;

#[derive(Deserialize, Serialize, Debug, Clone)]
struct LogEntry {
    timestamp: String,
    level: String,
    message: String,
}

fn create_log_entry(level: &str, message: String) -> LogEntry {
    LogEntry {
        timestamp: Local::now().format("%H:%M:%S").to_string(),
        level: level.to_string(),
        message,
    }
}

async fn broadcast_log(socket: &SocketRef, room: &str, level: &str, message: String) {
    let log_entry = create_log_entry(level, message);
    if let Err(e) = socket.within(room.to_string()).emit("activity_log", &log_entry).await {
        eprintln!("Failed to broadcast log: {}", e);
    }
}





async fn on_connect(socket: SocketRef, Data(data): Data<String> ) {
    println!("Client connected: {}", socket.id);
    let app_state = get_app_state();
    let return_data = app_state.get(&(data + ":datas"));

    if let Err(e) = socket.emit("debug_init_data", &return_data) {
        eprintln!("Failed to send initial data: {}", e);
    }
}

async fn on_disconnect(socket: SocketRef) {
    println!("Client disconnected: {}", socket.id);
}

async fn on_new_message(socket: SocketRef, Data(data): Data<String>) {
    println!("Received message from {}: {}", socket.id, data);
    
    // 他のクライアントにメッセージをブロードキャスト
    if let Err(e) = socket.broadcast().emit("debug_new_msg", &data).await {
        eprintln!("Failed to broadcast message: {}", e);
    }
}

async fn join_data(socket: SocketRef, Data(data): Data<String>) {
    println!("Client connected: {}", socket.id);
    println!("Data received for join: {:?}", data);
    println!("Data type: {}", std::any::type_name_of_val(&data));
    println!("Data length: {}", data.len());
    
    if data.is_empty() || data == "undefined" || data == "null" {
        eprintln!("Invalid UUID received: {}", data);
        if let Err(e) = socket.emit("join_error", "無効なUUIDです") {
            eprintln!("Failed to send error message: {}", e);
        }
        return;
    }
    
    let app_state = get_app_state();
    
    let key = data.clone() + ":datas";
    let return_data = app_state.get(&key);
    if return_data.is_none() {
        eprintln!("No data found for key: {}", key);
        // UUIDが存在しない場合、エラーを返す
        if let Err(e) = socket.emit("join_error", "指定されたイベントが見つかりません") {
            eprintln!("Failed to send error message: {}", e);
        }
        return;
    }
    let return_data = return_data.unwrap();

    println!("Returning data: {:?}", return_data);

    // UUIDをroomとして使用してソケットを参加させる
    let room_name = data.clone();
    socket.join(room_name.clone());
    println!("Socket {} joined room: {}", socket.id, room_name);

    // 保存された設定があれば取得し、イベントデータに反映
    let app_state_settings = get_app_state4();
    let settings_key = data.clone() + ":settings";
    
    let mut final_data = return_data.clone();
    if let Some(saved_settings) = app_state_settings.get(&settings_key) {
        println!("Found saved settings for {}: {:?}", data, saved_settings);
        // 保存された設定で上書き
        final_data.arrowtoday = saved_settings.arrowtoday;
        final_data.autotodayregister = saved_settings.autotodayregister;
        final_data.soukai = saved_settings.soukai;
        final_data.nolist = saved_settings.nolist;
    } else {
        println!("No saved settings found for {}, using default settings from event data", data);
    }

    // クライアント接続のログをブロードキャスト
    let socket_clone = socket.clone();
    let room_clone = room_name.clone();
    tokio::spawn(async move {
        broadcast_log(&socket_clone, &room_clone, "server", format!("クライアントが接続しました (ID: {})", &socket_clone.id.to_string()[..8])).await;
    });

    // 最新の設定を反映したデータをクライアントに送信
    if let Err(e) = socket.emit("join_return", &final_data) {
        eprintln!("Failed to send initial data: {}", e);
    }
}

async fn sync_all_data(socket: SocketRef, Data(data): Data<String>) {
    println!("Received sync_all_data from {}: {:?}", socket.id, data);
    
    if data.is_empty() || data == "undefined" || data == "null" {
        eprintln!("Invalid UUID received in sync_all_data: {}", data);
        return;
    }
    
    // ここで全データを同期するロジックを実装
    let app_state = get_app_state2();
    let key = data.clone() + ":attendees";
    let return_data = app_state.get(&key);

    let app_state2 = get_app_state3();
    let key2 = data.clone() + ":ontheday";
    let return_data2 = app_state2.get(&key2);
    println!("Returning data: {:?}, {:?}", return_data, return_data2);

    if let Err(e) = socket.emit("register_attendees_return", &(return_data)) {
        eprintln!("Failed to send sync_all_data: {}", e);
    }

    if let Err(e) = socket.emit("register_ontheday_return", &(return_data2)) {
        eprintln!("Failed to send sync_all_data: {}", e);
    }
}




async fn register_today(socket: SocketRef, Data(data): Data<String>) {
    println!("Received register_today from {}: {}", socket.id, data);
    
}



#[derive(Deserialize, Serialize, Debug)]
struct AttendeeData {
    attendeeindex: Vec<i32>,
    uuid: String,
}

async fn register_attendees(socket: SocketRef, Data(data): Data<AttendeeData>) {
    println!("Received register_attendees from {}: {:?}", socket.id, data);

    let app_state = get_app_state2();
    let key = data.uuid.clone() + ":attendees";

    // 既存の出席者リストを取得
    let existing_attendees = app_state.get(&key).unwrap_or_default();

    // 新規登録者のみを抽出
    let new_registrations: Vec<i32> = data.attendeeindex
        .iter()
        .filter(|&index| !existing_attendees.contains(index))
        .copied()
        .collect();

    // result と data.attendeeindex をかぶりなしでマージ
    let merged_attendees: Vec<i32> = match app_state.get(&key) {
        Some(existing) => {
            let mut combined = existing.clone();
            for &item in &data.attendeeindex {
                if !combined.contains(&item) {
                    combined.push(item);
                }
            }
            combined
        },
        None => data.attendeeindex.clone(),
    };
    // merged_attendees を 昇順にソート
    let mut sorted_attendees = merged_attendees.clone();
    sorted_attendees.sort_unstable();

    println!("Merged attendees data: {:?}", sorted_attendees);

    app_state.insert(key.clone(), sorted_attendees.clone());

    // 新規登録された出席者のログを出力(インデックスから学籍番号を取得)
    if !new_registrations.is_empty() {
        let socket_clone = socket.clone();
        let uuid_clone = data.uuid.clone();
        tokio::spawn(async move {
            // 参加者リストを取得
            let app_state_participants = get_app_state();
            let participants_key = uuid_clone.clone() + ":datas";
            
            if let Some(event_data) = app_state_participants.get(&participants_key) {
                let participants = &event_data.participants;
                for &index in &new_registrations {
                    if let Some(student_id) = participants.get(index as usize) {
                        broadcast_log(&socket_clone, &uuid_clone, "info", format!("出席登録: {} が出席しました", student_id)).await;
                    } else {
                        broadcast_log(&socket_clone, &uuid_clone, "warning", format!("出席登録: インデックス {} (参加者情報が見つかりません)", index)).await;
                    }
                }
            }
        });
    }

    // 参加者の情報を同じroomのクライアントにのみブロードキャスト
    let room_name = data.uuid.clone();
    if let Err(e) = socket.within(room_name.clone()).emit("register_attendees_return", &sorted_attendees).await {
        eprintln!("Failed to send attendees data to room {}: {}", room_name, e);
    }
}

#[derive(Deserialize, Serialize, Debug)]
struct OnTheDayData {
    ontheday: Vec<String>,
    uuid: String,
}

async fn register_ontheday(socket: SocketRef, Data(data): Data<OnTheDayData>) {
    println!("Received register_ontheday from {}: {:?}", socket.id, data.ontheday);
    
    let app_state = get_app_state3();
    let key = data.uuid.clone() + ":ontheday";

    // 既存の当日参加者リストを取得
    let existing_ontheday = app_state.get(&key).unwrap_or_default();

    // 新規登録者のみを抽出
    let new_participants: Vec<String> = data.ontheday
        .iter()
        .filter(|id| !existing_ontheday.contains(id))
        .cloned()
        .collect();

    // result と data.ontheday をかぶりなしでマージ
    let merged_ontheday: Vec<String> = match app_state.get(&key) {
        Some(existing) => {
            let mut combined = existing.clone();
            for item in &data.ontheday {
                if !combined.contains(item) {
                    combined.push(item.clone());
                }
            }
            combined
        },
        None => data.ontheday.clone(),
    };


    app_state.insert(key.clone(), merged_ontheday.clone());

    // 新規登録された当日参加者のみログを出力
    if !new_participants.is_empty() {
        let socket_clone = socket.clone();
        let uuid_clone = data.uuid.clone();
        tokio::spawn(async move {
            for student_id in &new_participants {
                broadcast_log(&socket_clone, &uuid_clone, "info", format!("当日参加登録: {} が参加しました", student_id)).await;
            }
        });
    }

    // 参加者の情報を同じroomのクライアントにのみブロードキャスト
    let room_name = data.uuid.clone();
    if let Err(e) = socket.within(room_name.clone()).emit("register_ontheday_return", &merged_ontheday).await {
        eprintln!("Failed to send ontheday data to room {}: {}", room_name, e);
    }
}

#[derive(Deserialize, Serialize, Debug)]
struct SettingsData {
    arrowtoday: bool,
    autotodayregister: bool,
    soukai: bool,
    nolist: bool,
    uuid: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
struct SettingsChangeData{
    arrowtoday: bool,
    autotodayregister: bool,
}

#[derive(Deserialize, Serialize, Debug)]
struct UpdateSettingsData {
    uuid: String,
    settings: crate::Settings,
}

async fn update_settings(socket: SocketRef, Data(data): Data<UpdateSettingsData>) {
    println!("Update settings from client: {:?}", data);

    let app_state = get_app_state4();
    let key = data.uuid.clone() + ":settings";

    // 設定をストレージに保存
    app_state.insert(key.clone(), data.settings.clone());

    // 設定変更を同じroomの他のクライアントにブロードキャスト
    let room_name = data.uuid.clone();
    if let Err(e) = socket.within(room_name.clone()).emit("update_settings_return", &data.settings).await {
        eprintln!("Failed to broadcast settings update to room {}: {}", room_name, e);
    }
}

async fn settings_change(socket: SocketRef, Data(data): Data<SettingsData>) {
    // ここに設定変更のロジックを実装
    println!("Settings changed: {:?}", data);

    let app_state = get_app_state4();
    let key = data.uuid.clone() + ":settings";

    let return_data = crate::Settings {
        arrowtoday: data.arrowtoday,
        autotodayregister: data.autotodayregister,
        soukai: data.soukai,
        nolist: data.nolist,
    };

    app_state.insert(key.clone(), return_data.clone());

    // 設定変更を同じroomのクライアントにのみブロードキャスト
    let room_name = data.uuid.clone();
    if let Err(e) = socket.within(room_name.clone()).emit("settings_change_return", &return_data).await {
        eprintln!("Failed to send settings change data to room {}: {}", room_name, e);
    }
}


pub async fn start_socketio_server(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let (layer, io) = SocketIo::new_layer();

    // 接続時のハンドラー
    io.ns("/", |s: SocketRef| {
        println!("New connection: {}", s.id);

        //叙階接続時にはhashmapの内容を送信
        
        s.on("new_message", on_new_message);
        s.on("disconnect", on_disconnect);
        s.on_disconnect(on_disconnect);
        s.on("connect", on_connect);
        s.on("join", join_data);
        s.on("register_today" , register_today);
        s.on("register_attendees", register_attendees);
        s.on("register_ontheday" , register_ontheday);
        s.on("settings_change", settings_change);
        s.on("update_settings", update_settings);
        s.on("sync_all_data", sync_all_data);
    });

    let my_domain = local_ip().unwrap();

    // 静的ファイル配信用のHTTPサーバーを別ポートで起動
    let http_port = 50080;
    tokio::spawn(async move {
        if let Err(e) = start_http_server(http_port).await {
            eprintln!("Failed to start HTTP server: {}", e);
        }
    });

    // Create the app with CORS and Socket.IO layers
    let app = axum::Router::new()
        .layer(ServiceBuilder::new()
            .layer(CorsLayer::permissive())
            .layer(layer));

    // Start the server
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", my_domain, port)).await?;
    println!("Socket.IO server listening on {}:{}", my_domain, port);
    
    *IS_SERVER_RUNNING.lock().unwrap() = true;

    axum::serve(listener, app).await?;
    Ok(())
}

async fn start_http_server(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let my_domain = local_ip().unwrap();
    
    // 静的ファイルのパスを取得
    // まず実行ファイルと同じディレクトリのstaticフォルダを探す
    let exe_dir = std::env::current_exe()?
        .parent()
        .ok_or("Failed to get parent directory")?
        .to_path_buf();
    
    let static_dir = if exe_dir.join("static").exists() {
        // リリースビルド: 実行ファイルと同じディレクトリのstatic
        exe_dir.join("static")
    } else {
        // 開発モード: src-tauri/static
        std::env::current_dir()?.join("src-tauri").join("static")
    };
    
    // 静的ファイルが存在しない場合は作成
    if !static_dir.exists() {
        println!("Warning: Static directory does not exist, creating: {}", static_dir.display());
        std::fs::create_dir_all(&static_dir)?;
    }

    // 静的ファイル配信用のルーター
    let app = axum::Router::new()
        .fallback_service(ServeDir::new(&static_dir))
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", my_domain, port)).await?;
    println!("HTTP server listening on http://{}:{}", my_domain, port);
    println!("Serving static files from: {}", static_dir.display());
    
    axum::serve(listener, app).await?;
    Ok(())
}

