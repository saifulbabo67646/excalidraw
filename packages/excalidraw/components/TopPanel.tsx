import React from "react";
import "./TopPanel.scss";
import { UndoRedoActions } from "./Actions";
import type { UIAppState } from "../types";
import type { ActionManager } from "../actions/manager";
import clsx from "clsx";
import { ClearCanvas } from "./main-menu/DefaultItems";
import { UserList } from "./UserList";
import { ButtonIcon } from "./ButtonIcon";
import { commentIcon } from "./icons";
import { Button } from "./Button";

export const TopPanel = ({
  appState,
  actionManager,
}: {
  appState: UIAppState;
  actionManager: ActionManager;
}) => {
  return (
    <div className="top-panel">
      {/* Left Section */}
      <div className="left-section">
        <div className="icon-text">
          <img
            src="https://cdn.glitch.global/0a9ab45e-b01d-47b8-90dd-db2e125dba4e/2Ddrawing%20(1).png"
            alt="Annotate"
            className="icon"
          />
          <span>Annotate drawing</span>
        </div>
        <div className="actions">
          {!appState.viewModeEnabled && (
            <UndoRedoActions
              style={{ background: "#fff" }}
              renderAction={actionManager.renderAction}
              className={clsx("zen-mode-transition", {
                "layer-ui__wrapper__footer-left--transition-bottom":
                  appState.zenModeEnabled,
              })}
            />
          )}
          <ClearCanvas />
        </div>
      </div>

      {/* Middle Section */}
      <div className="middle-section">
        <span>2D file name</span>
      </div>

      {/* Right Section */}
      <div className="right-section">
        <div style={{ width: "200px" }}>
          {appState.collaborators.size > 0 && (
            <UserList
              collaborators={appState.collaborators}
              userToFollow={appState.userToFollow?.socketId || null}
            />
          )}
        </div>
        <div className="actions">
          <button className="action-btn">🗨️</button>
          <button className="action-btn">🖨️</button>
          <button className="action-btn download-btn">⬇️</button>
          <button className="save-btn">SAVE</button>
          <button className="close-btn">✖</button>
        </div>
      </div>
    </div>
  );
};
