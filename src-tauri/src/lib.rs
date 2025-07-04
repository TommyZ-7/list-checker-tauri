use serde::{ Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;
use tauri::State;
use std::sync::{Arc, Mutex, OnceLock};




pub mod socket;

pub use socket::*;


static IS_SERVER_RUNNING: Mutex<bool> = Mutex::new(false);


#[derive(Debug, Default)]
pub struct AppState {
    store: Mutex<HashMap<String, Eventstruct>>,
}
pub struct AppState2 {
    store: Mutex<HashMap<String, Vec<i32>>>,
}

pub struct AppState3 {
    store: Mutex<HashMap<String, Vec<String>>>,
}

pub struct AppState4 {
    store: Mutex<HashMap<String, Settings>>,
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

impl AppState2 {
    pub fn new() -> Self {
        Self {
            store: Mutex::new(HashMap::new()),
        }
    }
    
    pub fn insert(&self, key: String, value: Vec<i32>) {
        let mut store = self.store.lock().unwrap();
        store.insert(key, value);
    }
    
    pub fn get(&self, key: &str) -> Option<Vec<i32>> {
        let store = self.store.lock().unwrap();
        store.get(key).cloned()
    }
    
}

impl AppState3 {
    pub fn new() -> Self {
        Self {
            store: Mutex::new(HashMap::new()),
        }
    }
    
    pub fn insert(&self, key: String, value: Vec<String>) {
        let mut store = self.store.lock().unwrap();
        store.insert(key, value);
    }
    
    pub fn get(&self, key: &str) -> Option<Vec<String>> {
        let store = self.store.lock().unwrap();
        store.get(key).cloned()
    }
}

impl AppState4 {
    pub fn new() -> Self {
        Self {
            store: Mutex::new(HashMap::new()),
        }
    }
    
    pub fn insert(&self, key: String, value: Settings) {
        let mut store = self.store.lock().unwrap();
        store.insert(key, value);
    }
    
    pub fn get(&self, key: &str) -> Option<Settings> {
        let store = self.store.lock().unwrap();
        store.get(key).cloned()
    }
}

static APP_STATE: OnceLock<Arc<AppState>> = OnceLock::new();
static APP_STATE2: OnceLock<Arc<AppState2>> = OnceLock::new();
static APP_STATE3: OnceLock<Arc<AppState3>> = OnceLock::new();
static APP_STATE4: OnceLock<Arc<AppState4>> = OnceLock::new();

pub fn get_app_state() -> Arc<AppState> {
    APP_STATE.get_or_init(|| Arc::new(AppState::new())).clone()
}

pub fn get_app_state2() -> Arc<AppState2> {
    APP_STATE2.get_or_init(|| Arc::new(AppState2::new())).clone()
}
pub fn get_app_state3() -> Arc<AppState3> {
    APP_STATE3.get_or_init(|| Arc::new(AppState3::new())).clone()
}

pub fn get_app_state4() -> Arc<AppState4> {
    APP_STATE4.get_or_init(|| Arc::new(AppState4::new())).clone()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    arrowtoday: bool,
    autotodayregister: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Eventstruct {
    eventname: String,
    eventinfo: String,
    participants: Vec<String>,
    arrowtoday: bool,
    autotodayregister: bool,
    nolist: bool,
    soukai: bool,
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
    let uuid = uuid.split('-').next().unwrap_or(&uuid).to_string();
    let event_key = format!("{}:datas", uuid);

    let app_state = get_app_state();

    app_state.insert(event_key.clone(), parsed_data);

    

    println!("Event registered with key: {}", event_key);

    uuid
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct JsonToAttendeesStruct {
    attendeeindex: Vec<i32>,
    uuid: String,
}

#[tauri::command]
fn json_to_attendees(data: JsonToAttendeesStruct) -> String {
    println!("Received register_attendees: {:?}", data);
    let app_state = get_app_state2();
    let key = format!("{}:attendees", data.uuid);

    //既存のデータは取得しない
    app_state.insert(key.clone(), data.attendeeindex.clone());

    
    println!("Updated attendees for {}: {:?}", data.uuid, data.attendeeindex);

    // 参加者の情報をクライアントに送信
    let json = serde_json::to_string(&data).unwrap();
    json
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonToTodayStruct {
    uuid: String,
    today: Vec<String>,
}

#[tauri::command]
fn json_to_today(data: JsonToTodayStruct) -> String {
    println!("Received register_today: {:?}", data);
    let app_state = get_app_state3();
    let key =  format!("{}:ontheday", data.uuid);

    //既存のデータは取得しない
    app_state.insert(key.clone(), data.today.clone());
    println!("Updated today for {}: {:?}", data.uuid, data.today);
    // 今日の情報をクライアントに送信
    let json = serde_json::to_string(&data).unwrap();
    json
}





#[tauri::command]
fn get_event(uuid: String, ) -> Option<Eventstruct> {
    let app_state = get_app_state();


    app_state.get(&format!("{}:datas", uuid))
}

#[tauri::command]
fn get_local_ip() -> String {
    match local_ip_address::local_ip() {
        Ok(ip) => ip.to_string(),
        Err(e) => {
            eprintln!("Failed to get local IP address: {}", e);
            "Error".to_string()
        }
    }
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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AttendeeIndex {
    attendeeindex: Vec<i32>,
    uuid: String,
}



#[tauri::command]
fn register_attendees(data: AttendeeIndex) -> String {
    println!("Received register_attendees: {:?}", data);

    let app_state = get_app_state2();
    let key = format!("{}:attendees", data.uuid);

    // 既存のデータを取得
    let mut existing_attendees = app_state.get(&key).unwrap_or_else(|| vec![]);

    // 新しい参加者を追加（重複を避ける）
    for &index in &data.attendeeindex {
        if !existing_attendees.contains(&index) {
            existing_attendees.push(index);
        }
    }

    //昇順にソート
    existing_attendees.sort_unstable();

    // 更新されたデータを保存
    app_state.insert(key, existing_attendees.clone());

    println!("Updated attendees for {}: {:?}", data.uuid, existing_attendees);

    // 参加者の情報をクライアントに送信
    

    "Attendees registered successfully".to_string()

}

#[tauri::command]
fn server_check() -> bool {
    let is_running = IS_SERVER_RUNNING.lock().unwrap();
    *is_running
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            register_event, debug_hashmap, get_event, debug_run_server, register_attendees, get_local_ip , json_to_attendees, json_to_today, server_check
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

