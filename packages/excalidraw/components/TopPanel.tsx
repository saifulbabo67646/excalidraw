import React from "react";
import "./TopPanel.scss";
import { UndoRedoActions } from "./Actions";
import type { UIAppState } from "../types";
import type { ActionManager } from "../actions/manager";
import clsx from "clsx";
import { ClearCanvas } from "./main-menu/DefaultItems";
import { UserList } from "./UserList";
import { ButtonIcon } from "./ButtonIcon";
import { commentIcon, DownloadIcon, NewCommentIcon } from "./icons";
import { Button } from "./Button";
import { useExcalidrawSetAppState } from "./App";
import { atom, useAtom } from "jotai";

export const isCommentClicked = atom(false);
export const fileName = atom(null);

export const TopPanel = ({
  appState,
  actionManager,
}: {
  appState: UIAppState;
  actionManager: ActionManager;
}) => {
  const setAppState = useExcalidrawSetAppState();
  const [isCommentClick, setIsCommentClicked] = useAtom(isCommentClicked);
  const [newFileName, setNewFileName] = useAtom(fileName);
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
        <span>{newFileName ? newFileName : "2D file name"}</span>
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
          <button
            onClick={() => setIsCommentClicked(!isCommentClick)}
            className="action-btn"
          >
            <NewCommentIcon />
          </button>
          <button
            onClick={() => setAppState({ openDialog: { name: "imageExport" } })}
            className="action-btn download-btn"
          >
            <DownloadIcon />
          </button>
          <button className="save-btn">SAVE</button>
        </div>
      </div>
    </div>
  );
};
