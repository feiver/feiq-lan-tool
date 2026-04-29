use feiq_lan_tool_lib::app_state::AppState;
use feiq_lan_tool_lib::models::{AppPreferences, CloseAction};
use tauri::menu::{Menu, MenuEvent, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Manager, Window, WindowEvent};

pub const MAIN_TRAY_ID: &str = "main-tray";
const TRAY_SHOW_MENU_ID: &str = "tray_show";
const TRAY_QUIT_MENU_ID: &str = "tray_quit";

pub fn setup_tray(app: &App) -> tauri::Result<()> {
    if app.tray_by_id(MAIN_TRAY_ID).is_some() {
        return Ok(());
    }

    let show_item = MenuItem::with_id(
        app,
        TRAY_SHOW_MENU_ID,
        "显示主窗口",
        true,
        Option::<&str>::None,
    )?;
    let quit_item =
        MenuItem::with_id(app, TRAY_QUIT_MENU_ID, "退出", true, Option::<&str>::None)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let mut tray = TrayIconBuilder::with_id(MAIN_TRAY_ID)
        .menu(&menu)
        .show_menu_on_left_click(false);
    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }

    tray.build(app)?;
    Ok(())
}

pub fn apply_display_preferences(app: &AppHandle, preferences: &AppPreferences) {
    if let Some(tray) = app.tray_by_id(MAIN_TRAY_ID) {
        let _ = tray.set_visible(preferences.display.tray_enabled);
    }
}

pub fn handle_menu_event(app: &AppHandle, event: &MenuEvent) {
    match event.id().as_ref() {
        TRAY_SHOW_MENU_ID => show_main_window(app),
        TRAY_QUIT_MENU_ID => app.exit(0),
        _ => {}
    }
}

pub fn handle_tray_icon_event(app: &AppHandle, event: &TrayIconEvent) {
    if event.id().as_ref() != MAIN_TRAY_ID {
        return;
    }

    if should_show_main_window_for_tray_event(event) {
        show_main_window(app);
    }
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    if window.label() != "main" {
        return;
    }

    if let WindowEvent::CloseRequested { api, .. } = event {
        let state = window.app_handle().state::<AppState>().inner().clone();
        let preferences = state.settings_snapshot().preferences;
        let should_minimize_to_tray = preferences.display.tray_enabled
            && preferences.display.close_action == CloseAction::MinimizeToTray;

        if should_minimize_to_tray {
            api.prevent_close();
            let _ = window.hide();
        }
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn should_show_main_window_for_tray_event(event: &TrayIconEvent) -> bool {
    matches!(
        event,
        TrayIconEvent::Click {
            button: tauri::tray::MouseButton::Left,
            ..
        } | TrayIconEvent::DoubleClick {
            button: tauri::tray::MouseButton::Left,
            ..
        }
    )
}

#[cfg(test)]
mod tests {
    use super::should_show_main_window_for_tray_event;
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
    use tauri::{PhysicalPosition, Rect};

    use super::MAIN_TRAY_ID;

    #[test]
    fn right_click_does_not_request_showing_main_window() {
        let event = TrayIconEvent::Click {
            id: MAIN_TRAY_ID.into(),
            position: PhysicalPosition::new(0.0, 0.0),
            rect: Rect::default(),
            button: MouseButton::Right,
            button_state: MouseButtonState::Up,
        };

        assert!(!should_show_main_window_for_tray_event(&event));
    }

    #[test]
    fn left_click_requests_showing_main_window() {
        let event = TrayIconEvent::Click {
            id: MAIN_TRAY_ID.into(),
            position: PhysicalPosition::new(0.0, 0.0),
            rect: Rect::default(),
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
        };

        assert!(should_show_main_window_for_tray_event(&event));
    }
}
