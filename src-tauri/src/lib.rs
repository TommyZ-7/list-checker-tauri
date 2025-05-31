use serde::{ Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;


#[derive(Debug, Default)]
struct AppState {
    store: Mutex<HashMap<String, Eventstruct>>,
}




#[derive(Debug, Clone, Serialize, Deserialize)]
struct Eventstruct {
    eventname: String,
    eventinfo: String,
    participants: Vec<String>,
    arrowtoday: bool,
}
    
#[tauri::command]
fn register_event(data: String, state: State<AppState>) -> String {

    let parsed_data: Eventstruct = match serde_json::from_str(&data) {
        Ok(event) => event,
        Err(e) => {
            eprintln!("Failed to parse event data: {}", e);
            return String::new(); // Return an empty string on error
        }
    };


    let uuid = Uuid::new_v4().to_string();
    let event_key = format!("{}:datas", uuid);

    let mut store = state.store.lock().unwrap();
    store.insert(event_key.clone(), parsed_data);   

    println!("Event registered with key: {}", event_key);

    event_key
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


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![register_event, debug_hashmap])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

