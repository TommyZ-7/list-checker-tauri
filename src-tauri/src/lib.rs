use serde::{ Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;
use tauri::State;
use std::sync::{Arc, Mutex, OnceLock};


pub mod socket;

pub use socket::*;

#[derive(Debug, Default)]
pub struct AppState {
    store: Mutex<HashMap<String, Eventstruct>>,
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn insert(&self, key: String, value: Eventstruct) {
        let mut store = self.store.lock().unwrap();
        store.insert(key, value);
    }
    
    pub fn get(&self, key: &str) -> Option<Eventstruct> {
        let store = self.store.lock().unwrap();
        store.get(key).cloned()
    }
}

static APP_STATE: OnceLock<Arc<AppState>> = OnceLock::new();

pub fn get_app_state() -> Arc<AppState> {
    APP_STATE.get_or_init(|| Arc::new(AppState::new())).clone()
}




#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Eventstruct {
    eventname: String,
    eventinfo: String,
    participants: Vec<String>,
    arrowtoday: bool,
}
    
#[tauri::command]
fn register_event(data: String) -> String {

    let parsed_data: Eventstruct = match serde_json::from_str(&data) {
        Ok(event) => event,
        Err(e) => {
            eprintln!("Failed to parse event data: {}", e);
            return String::new(); // Return an empty string on error
        }
    };


    let uuid = Uuid::new_v4().to_string();
    let event_key = format!("{}:datas", uuid);

    let app_state = get_app_state();

    app_state.insert(event_key.clone(), parsed_data);

    

    println!("Event registered with key: {}", event_key);

    uuid
}

#[tauri::command]
fn get_event(uuid: String, ) -> Option<Eventstruct> {
    let app_state = get_app_state();


    app_state.get(&format!("{}:datas", uuid))



}


#[tauri::command]
fn debug_hashmap (state: State<AppState>) -> String {
    let store = state.store.lock().unwrap();
    let mut output = String::new();
    
    for (key, value) in store.iter() {
        output.push_str(&format!("Key: {}, Value: {:?}\n", key, value));
    }
    
    output

}

#[tauri::command]
async fn debug_run_server() -> String {
    let port = 12345;
    match start_socketio_server(port).await {
        Ok(_) => format!("Socket.IO server started on port {}", port),
        Err(e) => format!("Failed to start Socket.IO server: {}", e),
    }
    
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![register_event, debug_hashmap, get_event, debug_run_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

