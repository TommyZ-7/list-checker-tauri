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

    // 初期データをクライアントに送信

    


    if let Err(e) = socket.emit("join_return", &return_data) {
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

    

    
    let result = app_state.get(&key);

    // result と data.attendeeindex をかぶりなしでマージ
    let merged_attendees: Vec<i32> = match result {
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

    // 参加者の情報をクライアントに送信
    if let Err(e) = socket.broadcast().emit("register_attendees_return", &sorted_attendees).await {
        eprintln!("Failed to send attendees data: {}", e);
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

    let result = app_state.get(&key);

    // result と data.ontheday をかぶりなしでマージ
    let merged_ontheday: Vec<String> = match result {
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

    // 参加者の情報をクライアントに送信
    if let Err(e) = socket.broadcast().emit("register_ontheday_return", &merged_ontheday).await {
        eprintln!("Failed to send ontheday data: {}", e);
    }
}

#[derive(Deserialize, Serialize, Debug)]
struct SettingsData {
    arrowtoday: bool,
    autotodayregister: bool,
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

    // 設定変更を他の全クライアントにブロードキャスト
    if let Err(e) = socket.broadcast().emit("update_settings_return", &data.settings).await {
        eprintln!("Failed to broadcast settings update: {}", e);
    }
    
    // 送信元クライアントにも確認を返す
    if let Err(e) = socket.emit("update_settings_return", &data.settings) {
        eprintln!("Failed to send settings update confirmation: {}", e);
    }
}

async fn settings_change(socket: SocketRef, Data(data): Data<SettingsData>) {
    // ここに設定変更のロジックを実装
    println!("Settings changed: {:?}", data);

    let app_state = get_app_state4();
    let key = data.uuid.clone() + ":settings";

    let arrow = data.arrowtoday;
    let auto = data.autotodayregister;

    let return_data = crate::Settings {
        arrowtoday: arrow,
        autotodayregister: auto,
    };

    app_state.insert(key.clone(), return_data.clone());

    if let Err(e) = socket.broadcast().emit("settings_change_return", &return_data).await {
        eprintln!("Failed to send settings change data: {}", e);
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
    let http_port = 8080;
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

