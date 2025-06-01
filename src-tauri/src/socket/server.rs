use socketioxide::{extract::{Data, SocketRef}, SocketIo};
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;
use crate::get_app_state;
use local_ip_address::local_ip;



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
    println!("Data received for join: {}", data);
    let app_state = get_app_state();
    
    let key = data.clone() + ":datas";
    let return_data = app_state.get(&key);
    if return_data.is_none() {
        eprintln!("No data found for key: {}", key);
        return;
    }
    let return_data = return_data.unwrap();

    println!("Returning data: {:?}", return_data);

    // 初期データをクライアントに送信


    if let Err(e) = socket.emit("join_return", &return_data) {
        eprintln!("Failed to send initial data: {}", e);
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
        s.on("connect", on_connect );
        s.on("join", join_data)
    });

    // Create the app with CORS and Socket.IO layers
    let app = axum::Router::new()
        .layer(ServiceBuilder::new()
            .layer(CorsLayer::permissive())
            .layer(layer));

    let my_domain = local_ip().unwrap();

    // Start the server
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", my_domain, port)).await?;
    println!("Socket.IO server listening on port {}", port);
    
    axum::serve(listener, app).await?;
    Ok(())
}

