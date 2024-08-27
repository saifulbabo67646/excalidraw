import polyfill from "../packages/excalidraw/polyfill";
import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "../packages/excalidraw/analytics";
import { getDefaultAppState } from "../packages/excalidraw/appState";
import { ErrorDialog } from "../packages/excalidraw/components/ErrorDialog";
import { TopErrorBoundary } from "./components/TopErrorBoundary";
import {
  APP_NAME,
  EVENT,
  MIME_TYPES,
  THEME,
  TITLE_TIMEOUT,
  VERSION_TIMEOUT,
} from "../packages/excalidraw/constants";
import { loadFromBlob } from "../packages/excalidraw/data/blob";
import type {
  FileId,
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "../packages/excalidraw/element/types";
import { useCallbackRefState } from "../packages/excalidraw/hooks/useCallbackRefState";
import { t } from "../packages/excalidraw/i18n";
import {
  Excalidraw,
  LiveCollaborationTrigger,
  TTDDialog,
  TTDDialogTrigger,
  StoreAction,
  reconcileElements,
  Footer,
  getVisibleSceneBounds,
  convertToExcalidrawElements,
} from "../packages/excalidraw";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
  ExcalidrawInitialDataState,
  UIAppState,
  PointerDownState as ExcalidrawPointerDownState,
  BinaryFileData,
} from "../packages/excalidraw/types";
import type { ResolvablePromise } from "../packages/excalidraw/utils";
import {
  debounce,
  getVersion,
  getFrame,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  isRunningInIframe,
  sceneCoordsToViewportCoords,
  viewportCoordsToSceneCoords,
} from "../packages/excalidraw/utils";
import {
  FIREBASE_STORAGE_PREFIXES,
  isExcalidrawPlusSignedUser,
  STORAGE_KEYS,
  SYNC_BROWSER_TABS_TIMEOUT,
} from "./app_constants";
import type { CollabAPI } from "./collab/Collab";
import Collab, {
  collabAPIAtom,
  isCollaboratingAtom,
  isOfflineAtom,
} from "./collab/Collab";
import {
  exportToBackend,
  getCollaborationLinkData,
  isCollaborationLink,
  loadScene,
} from "./data";
import {
  importFromLocalStorage,
  importUsernameFromLocalStorage,
} from "./data/localStorage";
import CustomStats from "./CustomStats";
import type { RestoredDataState } from "../packages/excalidraw/data/restore";
import { restore, restoreAppState } from "../packages/excalidraw/data/restore";
import {
  ExportToExcalidrawPlus,
  exportToExcalidrawPlus,
} from "./components/ExportToExcalidrawPlus";
import { updateStaleImageStatuses } from "./data/FileManager";
import { newElementWith } from "../packages/excalidraw/element/mutateElement";
import { isInitializedImageElement } from "../packages/excalidraw/element/typeChecks";
// import { loadFilesFromFirebase } from "./data/firebase";
import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
} from "./data/LocalData";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import clsx from "clsx";
import {
  parseLibraryTokensFromUrl,
  useHandleLibrary,
} from "../packages/excalidraw/data/library";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
// import { AppFooter } from "./components/AppFooter";
import { Provider, useAtom, useAtomValue } from "jotai";
import { useAtomWithInitialValue } from "../packages/excalidraw/jotai";
import { appJotaiStore } from "./app-jotai";

import "./index.scss";
import type { ResolutionType } from "../packages/excalidraw/utility-types";
import { ShareableLinkDialog } from "../packages/excalidraw/components/ShareableLinkDialog";
import { openConfirmModal } from "../packages/excalidraw/components/OverwriteConfirm/OverwriteConfirmState";
import { OverwriteConfirmDialog } from "../packages/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import Trans from "../packages/excalidraw/components/Trans";
import { ShareDialog, shareDialogStateAtom } from "./share/ShareDialog";
import CollabError, { collabErrorIndicatorAtom } from "./collab/CollabError";
import type { RemoteExcalidrawElement } from "../packages/excalidraw/data/reconcile";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "../packages/excalidraw/components/CommandPalette/CommandPalette";
import {
  GithubIcon,
  XBrandIcon,
  DiscordIcon,
  ExcalLogo,
  usersIcon,
  exportToPlus,
  share,
  youtubeIcon,
  CloseIcon,
  NewCommentIcon,
} from "../packages/excalidraw/components/icons";
import { appThemeAtom, useHandleAppTheme } from "./useHandleAppTheme";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import { getStorageBackend } from "./data/config";
import { KEYS } from "../packages/excalidraw/keys";
import { nanoid } from "nanoid";
import {
  distance2d,
  withBatchedUpdates,
  withBatchedUpdatesThrottled,
} from "./utils";
import CustomFooter from "./components/CustomFooter";
import CommentThread, {
  CommentCard,
  CommentInput,
  LineBreaker,
} from "./components/comment/CommentThread";
import { AppFooter } from "./components/AppFooter";
import {
  isCommentClicked,
  fileName,
} from "../packages/excalidraw/components/TopPanel";
import "./components/comment/CommentList.scss";
import initEcho from "./data/echo";
import AccessDenied from "../packages/excalidraw/components/AccessDenied";
import Spinner from "../packages/excalidraw/components/Spinner";

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;

export type Comment = {
  created_at?: string | number | Date;
  user?: any;
  x: number;
  y: number;
  value: string;
  id?: string;
};

type PointerDownState = {
  x: number;
  y: number;
  hitElement: Comment;
  onMove: any;
  onUp: any;
  hitElementOffsets: {
    x: number;
    y: number;
  };
};

const COMMENT_ICON_DIMENSION = 32;
const COMMENT_INPUT_HEIGHT = 50;
const COMMENT_INPUT_WIDTH = 150;

const VITE_APP_TAIGA_BACKEND_URL = import.meta.env.VITE_APP_TAIGA_BACKEND_URL;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;

// Adding a listener outside of the component as it may (?) need to be
// subscribed early to catch the event.
//
// Also note that it will fire only if certain heuristics are met (user has
// used the app for some time, etc.)
window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    // prevent Chrome <= 67 from automatically showing the prompt
    event.preventDefault();
    // cache for later use
    pwaEvent = event;
  },
);

let isSelfEmbedding = false;

if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const shareableLinkConfirmDialog = {
  title: t("overwriteConfirm.modal.shareableLink.title"),
  description: (
    <Trans
      i18nKey="overwriteConfirm.modal.shareableLink.description"
      bold={(text) => <strong>{text}</strong>}
      br={() => <br />}
    />
  ),
  actionLabel: t("overwriteConfirm.modal.shareableLink.button"),
  color: "danger",
} as const;

const initializeScene = async (opts: {
  collabAPI: CollabAPI | null;
  excalidrawAPI: ExcalidrawImperativeAPI;
}): Promise<
  { scene: ExcalidrawInitialDataState | null } & (
    | { isExternalScene: true; id: string; key: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  const jsonBackendMatch = window.location.hash.match(
    /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/,
  );
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  const localDataState = importFromLocalStorage();

  let scene: RestoredDataState & {
    scrollToContent?: boolean;
  } = await loadScene(null, null, localDataState);

  let roomLinkData = getCollaborationLinkData(window.location.href);
  const isExternalScene = !!(id || jsonBackendMatch || roomLinkData);
  if (isExternalScene) {
    if (
      // don't prompt if scene is empty
      !scene.elements.length ||
      // don't prompt for collab scenes because we don't override local storage
      roomLinkData ||
      // otherwise, prompt whether user wants to override current scene
      (await openConfirmModal(shareableLinkConfirmDialog))
    ) {
      if (jsonBackendMatch) {
        scene = await loadScene(
          jsonBackendMatch[1],
          jsonBackendMatch[2],
          localDataState,
        );
      }
      scene.scrollToContent = true;
      if (!roomLinkData) {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    } else {
      // https://github.com/excalidraw/excalidraw/issues/1919
      if (document.hidden) {
        return new Promise((resolve, reject) => {
          window.addEventListener(
            "focus",
            () => initializeScene(opts).then(resolve).catch(reject),
            {
              once: true,
            },
          );
        });
      }

      roomLinkData = null;
      window.history.replaceState({}, APP_NAME, window.location.origin);
    }
  } else if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);

    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      if (
        !scene.elements.length ||
        (await openConfirmModal(shareableLinkConfirmDialog))
      ) {
        return { scene: data, isExternalScene };
      }
    } catch (error: any) {
      return {
        scene: {
          appState: {
            errorMessage: t("alerts.invalidSceneUrl"),
          },
        },
        isExternalScene,
      };
    }
  }

  if (roomLinkData && opts.collabAPI) {
    const { excalidrawAPI } = opts;

    const scene = await opts.collabAPI.startCollaboration(roomLinkData);

    return {
      // when collaborating, the state may have already been updated at this
      // point (we may have received updates from other clients), so reconcile
      // elements and appState with existing state
      scene: {
        ...scene,
        appState: {
          ...restoreAppState(
            {
              ...scene?.appState,
              theme: localDataState?.appState?.theme || scene?.appState?.theme,
            },
            excalidrawAPI.getAppState(),
          ),
          // necessary if we're invoking from a hashchange handler which doesn't
          // go through App.initializeScene() that resets this flag
          isLoading: false,
        },
        elements: reconcileElements(
          scene?.elements || [],
          excalidrawAPI.getSceneElementsIncludingDeleted() as RemoteExcalidrawElement[],
          excalidrawAPI.getAppState(),
        ),
      },
      isExternalScene: true,
      id: roomLinkData.roomId,
      key: roomLinkData.roomKey,
    };
  } else if (scene) {
    return isExternalScene && jsonBackendMatch
      ? {
          scene,
          isExternalScene,
          id: jsonBackendMatch[1],
          key: jsonBackendMatch[2],
        }
      : { scene, isExternalScene: false };
  }
  return { scene: null, isExternalScene: false };
};

const ExcalidrawWrapper = () => {
  const appRef = useRef<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // const isCollabDisabled = isRunningInIframe();
  const isCollabDisabled = false;

  const [appTheme, setAppTheme] = useAtom(appThemeAtom);
  const { editorTheme } = useHandleAppTheme();

  const [langCode, setLangCode] = useAppLangCode();

  const [commentIcons, setCommentIcons] = useState<{
    [id: string]: {
      created_at: string | number | Date;
      user: any;
      x: number;
      y: number;
      id: string;
      value: string;
      replies?: [Comment];
    };
  }>({});
  const [comment, setComment] = useState<Comment | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [scrollChange, setScrollChange] = useState<boolean>(false);
  const [commentPlaceChange, setCommentPlaceChange] = useState<boolean>(false);
  const [commentMoveId, setCommentMoveId] = useState<string | null>(null);
  const [editCommentClick, setEditCommentClick] = useState<Comment | null>(
    null,
  );
  const [editComment, setEditComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // initial state
  // ---------------------------------------------------------------------------

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ExcalidrawInitialDataState | null>();
  }

  useEffect(() => {
    setLoading(true);
    console.log(window.location.href);

    let tokenParam;
    if (process.env.NODE_ENV === "production") {
      // In production, get the token from cookies
      const cookies = document.cookie.split("; ");
      const tokenCookie = cookies.find((cookie) => cookie.startsWith("token="));

      if (tokenCookie) {
        tokenParam = tokenCookie.split("=")[1];
      } else {
        //@TODO: this logic for temporary as the cookie sharing not working.
        // In development, get the token from URL parameters
        const params = new URLSearchParams(window.location.search);
        tokenParam = params.get("token");
      }
    } else {
      // In development, get the token from URL parameters
      const params = new URLSearchParams(window.location.search);
      tokenParam = params.get("token");
    }

    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    if (tokenParam) {
      setToken(tokenParam);
    }
    setUserType(typeParam);
    trackEvent("load", "frame", getFrame());
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const url =
        userType === "user"
          ? `${VITE_APP_TAIGA_BACKEND_URL}/users/me`
          : `${VITE_APP_TAIGA_BACKEND_URL}/admin/admins/me`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const json = await response.json();
      setUser(json.data);
      token && (await getAllComment(token));
      setLoading(false);
    };
    if (token) {
      fetchData();
    }
  }, [token, userType]);

  const getAllComment = async (token: string) => {
    // lets fetch comment from the api
    const roomLinkData = getCollaborationLinkData(window.location.href);
    const commentResponse = await fetch(
      `${VITE_APP_TAIGA_BACKEND_URL}/rooms/${roomLinkData?.roomId}/comments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );
    const commentJson = await commentResponse.json();
    let tempObj = {};
    if (commentJson.length > 0) {
      commentJson.forEach(
        (element: {
          created_at: any;
          user: any;
          comment_id: null;
          replies: any;
          id: any;
          x: number;
          y: any;
          value: any;
        }) => {
          if (element.comment_id === null) {
            tempObj = {
              ...tempObj,
              [element?.id]: {
                x: element?.id ? element?.x - 60 : element.x,
                y: Number(element?.y),
                id: element?.id,
                value: element?.value,
                user: element?.user,
                replies: element?.replies,
                created_at: element?.created_at,
              },
            };
          }
        },
      );
      setCommentIcons(tempObj);
    }
  };

  useEffect(() => {
    const listenForCommentUpdates = (echo: any, roomId: string) => {
      echo
        .join(`annotation.room.${roomId}`)
        .listen(".room.message", (e: { comment: any }) => {
          token && getAllComment(token);
        })
        .error((err: any) => console.log(err));
    };
    const roomLinkData = getCollaborationLinkData(window.location.href);
    if (token && roomLinkData?.roomId) {
      const echo = initEcho(token);
      listenForCommentUpdates(echo, roomLinkData?.roomId);
    }
  }, [token]);

  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

  const [, setShareDialogState] = useAtom(shareDialogStateAtom);
  const [collabAPI] = useAtom(collabAPIAtom);
  const [isCollaborating] = useAtomWithInitialValue(isCollaboratingAtom, () => {
    return isCollaborationLink(window.location.href);
  });
  const collabError = useAtomValue(collabErrorIndicatorAtom);

  const [isCommentClick, setIsCommentClick] = useAtom(isCommentClicked);
  const [newFileName, setNewFileName] = useAtom(fileName);

  useHandleLibrary({
    excalidrawAPI,
    adapter: LibraryIndexedDBAdapter,
    // TODO maybe remove this in several months (shipped: 24-03-11)
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  useEffect(() => {
    collabAPI?.setAvatarUrl(user?.image || null);
    collabAPI?.setUsername(user?.name || "");
  }, [collabAPI, user?.image, user?.name]);

  useEffect(() => {
    const fetchRoomData = async () => {
      const roomLinkData = getCollaborationLinkData(window.location.href);
      const response = await fetch(
        `${VITE_APP_TAIGA_BACKEND_URL}/annotation-room/${roomLinkData?.roomId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );
      const jsonRes = await response.json();
      setNewFileName(jsonRes[0]?.asset_blueprint?.name);
      if (!jsonRes[0]?.is_file_load_canvas) {
        fetchData(jsonRes[0]?.asset_blueprint?.s3_url, jsonRes[0]?.id);
      }
    };
    const fetchData = async (filePath: string, id: string) => {
      try {
        const res = await fetch(filePath);

        if (!res.ok) {
          throw new Error(`Failed to fetch image: ${res.statusText}`);
        }

        const imageData = await res.blob();
        const reader = new FileReader();
        reader.readAsDataURL(imageData);

        reader.onload = function () {
          const imageUrl = reader.result as string;

          const img = new Image();
          img.src = imageUrl;

          img.onload = function () {
            const originalWidth = img.naturalWidth;
            const originalHeight = img.naturalHeight;

            const imagesArray: BinaryFileData[] = [
              {
                id: "3dpc" as BinaryFileData["id"],
                dataURL: reader.result as BinaryFileData["dataURL"],
                mimeType: MIME_TYPES.png,
                created: Date.now(),
                lastRetrieved: Date.now(),
              },
            ];

            excalidrawAPI?.updateScene({
              elements: convertToExcalidrawElements([
                {
                  type: "image",
                  x: 100,
                  y: 100,
                  width: originalWidth,
                  height: originalHeight,
                  fileId: "3dpc" as FileId,
                },
              ]),
            });

            excalidrawAPI?.addFiles(imagesArray);
            updateStatus(id);
          };
        };

        reader.onerror = function () {
          console.error("Error reading the image data.");
        };
      } catch (error) {
        console.error("Error fetching image from S3:", error);
      }
    };
    const updateStatus = async (id: string) => {
      const res = await fetch(
        `${VITE_APP_TAIGA_BACKEND_URL}/annotation-room/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          method: "PUT",
          body: JSON.stringify({
            is_file_load_canvas: true,
          }),
        },
      );
      const resJson = await res.json();
      console.log(resJson);
    };

    if (token && excalidrawAPI) {
      fetchRoomData();
    }
  }, [token, excalidrawAPI]);

  useEffect(() => {
    if (!excalidrawAPI || (!isCollabDisabled && !collabAPI)) {
      return;
    }

    const loadImages = (
      data: ResolutionType<typeof initializeScene>,
      isInitialLoad = false,
    ) => {
      if (!data.scene) {
        return;
      }
      if (collabAPI?.isCollaborating()) {
        if (data.scene.elements) {
          collabAPI
            .fetchImageFilesFromFirebase({
              elements: data.scene.elements,
              forceFetchFiles: true,
            })
            .then(({ loadedFiles, erroredFiles }) => {
              excalidrawAPI.addFiles(loadedFiles);
              updateStaleImageStatuses({
                excalidrawAPI,
                erroredFiles,
                elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
              });
            });
        }
      } else {
        const fileIds =
          data.scene.elements?.reduce((acc, element) => {
            if (isInitializedImageElement(element)) {
              return acc.concat(element.fileId);
            }
            return acc;
          }, [] as FileId[]) || [];

        if (data.isExternalScene) {
          // loadFilesFromFirebase(
          //   `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
          //   data.key,
          //   fileIds,
          // )
          getStorageBackend()
            .then((storageBackend) => {
              return storageBackend.loadFilesFromStorageBackend(
                `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
                data.key,
                fileIds,
              );
            })
            .then(({ loadedFiles, erroredFiles }) => {
              excalidrawAPI.addFiles(loadedFiles);
              updateStaleImageStatuses({
                excalidrawAPI,
                erroredFiles,
                elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
              });
            });
        } else if (isInitialLoad) {
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  excalidrawAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  excalidrawAPI,
                  erroredFiles,
                  elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
          // on fresh load, clear unused files from IDB (from previous
          // session)
          LocalData.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
        }
      }
    };

    initializeScene({ collabAPI, excalidrawAPI }).then(async (data) => {
      loadImages(data, /* isInitialLoad */ true);
      initialStatePromiseRef.current.promise.resolve(data.scene);
    });

    const onHashChange = async (event: HashChangeEvent) => {
      event.preventDefault();
      const libraryUrlTokens = parseLibraryTokensFromUrl();
      if (!libraryUrlTokens) {
        if (
          collabAPI?.isCollaborating() &&
          !isCollaborationLink(window.location.href)
        ) {
          collabAPI.stopCollaboration(false);
        }
        excalidrawAPI.updateScene({ appState: { isLoading: true } });

        initializeScene({ collabAPI, excalidrawAPI }).then((data) => {
          loadImages(data);
          if (data.scene) {
            excalidrawAPI.updateScene({
              ...data.scene,
              ...restore(data.scene, null, null, { repairBindings: true }),
              storeAction: StoreAction.CAPTURE,
            });
          }
        });
      }
    };

    const titleTimeout = setTimeout(
      () => (document.title = APP_NAME),
      TITLE_TIMEOUT,
    );

    const syncData = debounce(() => {
      if (isTestEnv()) {
        return;
      }
      if (
        !document.hidden &&
        ((collabAPI && !collabAPI.isCollaborating()) || isCollabDisabled)
      ) {
        // don't sync if local state is newer or identical to browser state
        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
          const localDataState = importFromLocalStorage();
          const username = importUsernameFromLocalStorage();
          setLangCode(getPreferredLanguage());
          excalidrawAPI.updateScene({
            ...localDataState,
            storeAction: StoreAction.UPDATE,
          });
          LibraryIndexedDBAdapter.load().then((data) => {
            if (data) {
              excalidrawAPI.updateLibrary({
                libraryItems: data.libraryItems,
              });
            }
          });
          collabAPI?.setUsername(username || "");
        }

        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
          const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
          const currFiles = excalidrawAPI.getFiles();
          const fileIds =
            elements?.reduce((acc, element) => {
              if (
                isInitializedImageElement(element) &&
                // only load and update images that aren't already loaded
                !currFiles[element.fileId]
              ) {
                return acc.concat(element.fileId);
              }
              return acc;
            }, [] as FileId[]) || [];
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  excalidrawAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  excalidrawAPI,
                  erroredFiles,
                  elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
        }
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    const onUnload = () => {
      LocalData.flushSave();
    };

    const visibilityChange = (event: FocusEvent | Event) => {
      if (event.type === EVENT.BLUR || document.hidden) {
        LocalData.flushSave();
      }
      if (
        event.type === EVENT.VISIBILITY_CHANGE ||
        event.type === EVENT.FOCUS
      ) {
        syncData();
      }
    };

    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onUnload, false);
    window.addEventListener(EVENT.BLUR, visibilityChange, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    window.addEventListener(EVENT.FOCUS, visibilityChange, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onUnload, false);
      window.removeEventListener(EVENT.BLUR, visibilityChange, false);
      window.removeEventListener(EVENT.FOCUS, visibilityChange, false);
      document.removeEventListener(
        EVENT.VISIBILITY_CHANGE,
        visibilityChange,
        false,
      );
      clearTimeout(titleTimeout);
    };
  }, [isCollabDisabled, collabAPI, excalidrawAPI, setLangCode]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      LocalData.flushSave();

      if (
        excalidrawAPI &&
        LocalData.fileStorage.shouldPreventUnload(
          excalidrawAPI.getSceneElements(),
        )
      ) {
        preventUnload(event);
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [excalidrawAPI]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateCommentApi = useCallback(
    async (comment: Comment) => {
      const response = await fetch(
        `${VITE_APP_TAIGA_BACKEND_URL}/comments/${comment?.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: userType,
            value: comment.value,
            x: comment.x,
            y: comment.y,
          }),
        },
      );
      return await response.json();
    },
    [token, userType],
  );

  const deleteCommentApi = useCallback(
    async (comment: Comment) => {
      const response = await fetch(
        `${VITE_APP_TAIGA_BACKEND_URL}/comments/${comment?.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        return "comment Deleted successfully";
      }
    },
    [token],
  );

  useEffect(() => {
    if (commentPlaceChange && commentMoveId) {
      let obj = commentIcons[commentMoveId];
      obj = {
        ...obj,
        x: obj.x + 60,
      };
      updateCommentApi(obj);
      setCommentPlaceChange(false);
    }
  }, [
    commentPlaceChange,
    commentMoveId,
    commentIcons,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    updateCommentApi,
  ]);

  const onChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (collabAPI?.isCollaborating()) {
      collabAPI.syncElements(elements);
    }

    // this check is redundant, but since this is a hot path, it's best
    // not to evaludate the nested expression every time
    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;

          const elements = excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (
                LocalData.fileStorage.shouldUpdateImageElementStatus(element)
              ) {
                const newElement = newElementWith(element, { status: "saved" });
                if (newElement !== element) {
                  didChange = true;
                }
                return newElement;
              }
              return element;
            });

          if (didChange) {
            excalidrawAPI.updateScene({
              elements,
              storeAction: StoreAction.UPDATE,
            });
          }
        }
      });
    }
  };

  const [latestShareableLink, setLatestShareableLink] = useState<string | null>(
    null,
  );

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    if (exportedElements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      const { url, errorMessage } = await exportToBackend(
        exportedElements,
        {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        },
        files,
      );

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (url) {
        setLatestShareableLink(url);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const { width, height } = appState;
        console.error(error, {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio,
        });
        throw new Error(error.message);
      }
    }
  };

  const renderCustomStats = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: UIAppState,
  ) => {
    return (
      <CustomStats
        setToast={(message) => excalidrawAPI!.setToast({ message })}
        appState={appState}
        elements={elements}
      />
    );
  };

  const isOffline = useAtomValue(isOfflineAtom);

  const onCollabDialogOpen = useCallback(
    () => setShareDialogState({ isOpen: true, type: "collaborationOnly" }),
    [setShareDialogState],
  );

  if (loading) {
    return <Spinner />;
  }

  // Show Access Denied component if no token is present
  if (!token || !user) {
    return <AccessDenied />;
  }
  // browsers generally prevent infinite self-embedding, there are
  // cases where it still happens, and while we disallow self-embedding
  // by not whitelisting our own origin, this serves as an additional guard
  if (isSelfEmbedding) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
        }}
      >
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  const ExcalidrawPlusCommand = {
    label: "Excalidraw+",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: <div style={{ width: 14 }}>{ExcalLogo}</div>,
    keywords: ["plus", "cloud", "server"],
    perform: () => {
      window.open(
        `${
          import.meta.env.VITE_APP_PLUS_LP
        }/plus?utm_source=excalidraw&utm_medium=app&utm_content=command_palette`,
        "_blank",
      );
    },
  };
  const ExcalidrawPlusAppCommand = {
    label: "Sign up",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: <div style={{ width: 14 }}>{ExcalLogo}</div>,
    keywords: [
      "excalidraw",
      "plus",
      "cloud",
      "server",
      "signin",
      "login",
      "signup",
    ],
    perform: () => {
      window.open(
        `${
          import.meta.env.VITE_APP_PLUS_APP
        }?utm_source=excalidraw&utm_medium=app&utm_content=command_palette`,
        "_blank",
      );
    },
  };

  const handleMoveToComment = (
    e: React.MouseEvent<HTMLDivElement>,
    comment: Comment,
  ) => {
    const commentIconsElements = appRef.current.querySelectorAll(
      ".comment-icon",
    ) as HTMLElement[];
    commentIconsElements.forEach((ele) => {
      const id = ele.id;
      if (Number(comment.id) === Number(id)) {
        const appstate = excalidrawAPI?.getAppState();
        if (appstate) {
          const { x, y } = sceneCoordsToViewportCoords(
            { sceneX: comment?.x, sceneY: comment?.y },
            appstate,
          );
          excalidrawAPI?.updateScene({
            appState: {
              scrollX: appstate.scrollX - x + e.clientX / 2,
              scrollY: appstate.scrollY - y + e.clientY / 2,
            },
          });
        }

        setTimeout(() => {
          setComment({
            x: comment.x + 60,
            y: comment.y,
            value: "",
            id: comment.id,
          });
        }, 300);
      }
    });
  };

  // comment feature
  const onPointerDown = (
    activeTool: AppState["activeTool"],
    pointerDownState: ExcalidrawPointerDownState,
  ) => {
    if (activeTool.type === "custom" && activeTool.customType === "comment") {
      const { x, y } = pointerDownState.origin;
      setComment({ x, y, value: "" });
    }
  };

  const rerenderCommentIcons = () => {
    if (!excalidrawAPI) {
      return false;
    }
    comment && setComment(null);
    const commentIconsElements = appRef.current.querySelectorAll(
      ".comment-icon",
    ) as HTMLElement[];
    if (commentIconsElements.length > 0) {
      setScrollChange(true);
    }
    commentIconsElements.forEach((ele) => {
      const id = ele.id;
      const appstate = excalidrawAPI.getAppState();
      const { x, y } = sceneCoordsToViewportCoords(
        { sceneX: commentIcons[id].x, sceneY: commentIcons[id].y },
        appstate,
      );
      ele.style.left = `${
        x - COMMENT_ICON_DIMENSION / 2 - appstate!.offsetLeft
      }px`;
      ele.style.top = `${
        y - COMMENT_ICON_DIMENSION / 2 - appstate!.offsetTop
      }px`;
    });
  };

  const onPointerMoveFromPointerDownHandler = (
    pointerDownState: PointerDownState,
  ) => {
    return withBatchedUpdatesThrottled((event) => {
      if (!excalidrawAPI) {
        return false;
      }
      if (scrollChange) {
        setScrollChange(false);
        return false;
      }
      const { x, y } = viewportCoordsToSceneCoords(
        {
          clientX: event.clientX - pointerDownState.hitElementOffsets.x,
          clientY: event.clientY - pointerDownState.hitElementOffsets.y,
        },
        excalidrawAPI.getAppState(),
      );
      setCommentIcons({
        ...commentIcons,
        [pointerDownState.hitElement.id!]: {
          ...commentIcons[pointerDownState.hitElement.id!],
          x,
          y,
        },
      });
    });
  };

  const onPointerUpFromPointerDownHandler = (
    pointerDownState: PointerDownState,
  ) => {
    return withBatchedUpdates((event) => {
      window.removeEventListener(EVENT.POINTER_MOVE, pointerDownState.onMove);
      window.removeEventListener(EVENT.POINTER_UP, pointerDownState.onUp);
      excalidrawAPI?.setActiveTool({ type: "selection" });
      const distance = distance2d(
        pointerDownState.x,
        pointerDownState.y,
        event.clientX,
        event.clientY,
      );
      if (scrollChange) {
        setScrollChange(false);
      }
      if (distance === 0) {
        if (!comment) {
          setComment({
            x: pointerDownState.hitElement.x + 60,
            y: pointerDownState.hitElement.y,
            value: "",
            id: pointerDownState.hitElement.id,
          });
        } else {
          setComment(null);
        }
      } else {
        setCommentPlaceChange(true);
        setCommentMoveId(pointerDownState.hitElement.id!);
      }
    });
  };

  const renderCommentIcons = () => {
    return Object.values(commentIcons).map((commentIcon) => {
      if (!excalidrawAPI) {
        return false;
      }
      const appState = excalidrawAPI.getAppState();
      const { x, y } = sceneCoordsToViewportCoords(
        { sceneX: commentIcon.x, sceneY: commentIcon.y },
        excalidrawAPI.getAppState(),
      );
      // Fallback to user's first name initial if image is null
      const userImage = commentIcon?.user?.image;
      const userName = commentIcon?.user?.name;
      const avatarFallback = userName ? userName.charAt(0).toUpperCase() : "?";
      return (
        <div
          id={commentIcon.id}
          key={commentIcon.id}
          style={{
            top: `${y - COMMENT_ICON_DIMENSION / 2 - appState!.offsetTop}px`,
            left: `${x - COMMENT_ICON_DIMENSION / 2 - appState!.offsetLeft}px`,
            position: "absolute",
            zIndex: 2,
            width: `${COMMENT_ICON_DIMENSION}px`,
            height: `${COMMENT_ICON_DIMENSION}px`,
            cursor: "pointer",
            touchAction: "none",
          }}
          className="comment-icon"
          onPointerDown={(event) => {
            event.preventDefault();
            if (comment && comment.value) {
              commentIcon.value = comment.value;
              updateComment();
            }
            const pointerDownState: any = {
              x: event.clientX,
              y: event.clientY,
              hitElement: commentIcon,
              hitElementOffsets: { x: event.clientX - x, y: event.clientY - y },
            };
            const onPointerMove =
              onPointerMoveFromPointerDownHandler(pointerDownState);
            const onPointerUp =
              onPointerUpFromPointerDownHandler(pointerDownState);
            window.addEventListener(EVENT.POINTER_MOVE, onPointerMove);
            window.addEventListener(EVENT.POINTER_UP, onPointerUp);

            pointerDownState.onMove = onPointerMove;
            pointerDownState.onUp = onPointerUp;

            excalidrawAPI?.setActiveTool({
              type: "custom",
              customType: "comment",
            });
          }}
        >
          <div className="comment-avatar">
            {userImage ? (
              <img src={userImage} alt={userName} />
            ) : (
              <div className="avatar-fallback">{avatarFallback}</div>
            )}
          </div>
        </div>
      );
    });
  };

  const saveComment = async () => {
    console.log(comment);
    if (!comment) {
      return;
    }
    if (!comment.id && !comment.value) {
      setComment(null);
      return;
    }
    if (comment.id && !comment.value) {
      setComment(null);
      return;
    }
    console.log("comment", comment);
    // lets save the comment here
    const roomLinkData = getCollaborationLinkData(window.location.href);
    const response = await fetch(`${VITE_APP_TAIGA_BACKEND_URL}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user?.id,
        room_id: roomLinkData?.roomId,
        type: userType,
        value: comment.value,
        x: comment.x,
        y: comment.y,
        comment_id: comment.id,
      }),
    });
    const saveComment = await response.json();
    console.log(saveComment);
    const id = saveComment.id || nanoid();
    if (!comment.id) {
      setCommentIcons({
        ...commentIcons,
        [id]: {
          x: saveComment.id ? comment.x - 60 : comment.x,
          y: comment.y,
          id,
          value: comment.value,
          user,
        },
      });
    }
    setComment(null);
  };

  const updateComment = async () => {
    if (!comment) {
      return;
    }
    if (!comment.id && !comment.value) {
      setComment(null);
      return;
    }
    // lets save the comment here
    const saveComment = await updateCommentApi(comment);
    const id = saveComment.id || nanoid();
    setCommentIcons({
      ...commentIcons,
      [id]: {
        x: saveComment.id ? comment.x - 60 : comment.x,
        y: comment.y,
        id,
        value: comment.value,
      },
    });
    setComment(null);
  };

  const saveEditComment = async () => {
    if (!editComment) {
      return;
    }

    try {
      const saveComment = await updateCommentApi(editComment);
      if (saveComment) {
        setEditCommentClick(null);
        setEditComment(null);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const setDeleteCommentClick = async (data: Comment) => {
    try {
      await deleteCommentApi(data);
    } catch (err) {
      console.log(err);
    }
  };

  const renderComment = () => {
    if (!comment) {
      return null;
    }
    const appState = excalidrawAPI?.getAppState()!;
    const { x, y } = sceneCoordsToViewportCoords(
      { sceneX: comment.x, sceneY: comment.y },
      appState,
    );
    let top = y - COMMENT_ICON_DIMENSION / 2 - appState.offsetTop;
    let left = x - COMMENT_ICON_DIMENSION / 2 - appState.offsetLeft;

    if (
      top + COMMENT_INPUT_HEIGHT <
      appState.offsetTop + COMMENT_INPUT_HEIGHT
    ) {
      top = COMMENT_ICON_DIMENSION / 2;
    }
    if (top + COMMENT_INPUT_HEIGHT > appState.height) {
      top = appState.height - COMMENT_INPUT_HEIGHT - COMMENT_ICON_DIMENSION / 2;
    }
    if (
      left + COMMENT_INPUT_WIDTH <
      appState.offsetLeft + COMMENT_INPUT_WIDTH
    ) {
      left = COMMENT_ICON_DIMENSION / 2;
    }
    if (left + COMMENT_INPUT_WIDTH > appState.width) {
      left = appState.width - COMMENT_INPUT_WIDTH - COMMENT_ICON_DIMENSION / 2;
    }

    const commentThread = commentIcons[comment?.id!];

    if (commentThread) {
      return (
        <CommentThread
          commentThread={commentThread}
          style={{ top, left }}
          comment={comment}
          setComment={setComment}
          saveComment={saveComment}
          setEditCommentClick={setEditCommentClick}
          setDeleteCommentClick={setDeleteCommentClick}
          setEditComment={setEditComment}
          editComment={editComment}
          editCommentClick={editCommentClick}
          saveEditComment={saveEditComment}
        />
      );
    }
    return (
      <div
        style={{
          top: `${top}px`,
          left: `${left}px`,
          position: "absolute",
          zIndex: 2,
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0px 1px 5px 0px #0000002E",
        }}
      >
        <CommentInput
          comment={comment}
          setComment={setComment}
          saveComment={saveComment}
          onBlur={saveComment}
          autoFocus={true}
        />
      </div>
    );
  };

  return (
    <div
      style={{ height: "100%", position: "relative", overflow: "hidden" }}
      className={clsx("excalidraw-app", {
        "is-collaborating": isCollaborating,
      })}
      ref={appRef}
    >
      <Excalidraw
        excalidrawAPI={excalidrawRefCallback}
        onChange={onChange}
        initialData={initialStatePromiseRef.current.promise}
        isCollaborating={isCollaborating}
        onPointerUpdate={collabAPI?.onPointerUpdate}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {
              onExportToBackend,
              renderCustomUI: excalidrawAPI
                ? (elements, appState, files) => {
                    return (
                      <ExportToExcalidrawPlus
                        elements={elements}
                        appState={appState}
                        files={files}
                        name={excalidrawAPI.getName()}
                        onError={(error) => {
                          excalidrawAPI?.updateScene({
                            appState: {
                              errorMessage: error.message,
                            },
                          });
                        }}
                        onSuccess={() => {
                          excalidrawAPI.updateScene({
                            appState: { openDialog: null },
                          });
                        }}
                      />
                    );
                  }
                : undefined,
            },
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        // renderTopRightUI={(isMobile) => {
        //   if (isMobile || !collabAPI || isCollabDisabled) {
        //     return null;
        //   }
        //   return (
        //     // <div className="top-right-ui">
        //     //   {collabError.message && <CollabError collabError={collabError} />}
        //     //   <LiveCollaborationTrigger
        //     //     isCollaborating={isCollaborating}
        //     //     onSelect={() =>
        //     //       setShareDialogState({ isOpen: true, type: "share" })
        //     //     }
        //     //   />
        //     // </div>
        //     <div style={{ height: "400px", width: "275px" }}>
        //       <h2>Hello comment!!!</h2>
        //     </div>
        //   );
        // }}
        onPointerDown={onPointerDown}
        onScrollChange={rerenderCommentIcons}
      >
        <AppMainMenu
          onCollabDialogOpen={onCollabDialogOpen}
          isCollaborating={isCollaborating}
          isCollabEnabled={!isCollabDisabled}
          theme={appTheme}
          setTheme={(theme) => setAppTheme(theme)}
        />
        <AppWelcomeScreen
          onCollabDialogOpen={onCollabDialogOpen}
          isCollabEnabled={!isCollabDisabled}
        />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
          {excalidrawAPI && (
            <OverwriteConfirmDialog.Action
              title={t("overwriteConfirm.action.excalidrawPlus.title")}
              actionLabel={t("overwriteConfirm.action.excalidrawPlus.button")}
              onClick={() => {
                exportToExcalidrawPlus(
                  excalidrawAPI.getSceneElements(),
                  excalidrawAPI.getAppState(),
                  excalidrawAPI.getFiles(),
                  excalidrawAPI.getName(),
                );
              }}
            >
              {t("overwriteConfirm.action.excalidrawPlus.description")}
            </OverwriteConfirmDialog.Action>
          )}
        </OverwriteConfirmDialog>
        {/* <AppFooter /> */}
        {/* {excalidrawAPI && (
          <Footer>
            <CustomFooter excalidrawAPI={excalidrawAPI} />
          </Footer>
        )} */}
        <TTDDialog
          onTextSubmit={async (input) => {
            try {
              const response = await fetch(
                `${
                  import.meta.env.VITE_APP_AI_BACKEND
                }/v1/ai/text-to-diagram/generate`,
                {
                  method: "POST",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ prompt: input }),
                },
              );

              const rateLimit = response.headers.has("X-Ratelimit-Limit")
                ? parseInt(response.headers.get("X-Ratelimit-Limit") || "0", 10)
                : undefined;

              const rateLimitRemaining = response.headers.has(
                "X-Ratelimit-Remaining",
              )
                ? parseInt(
                    response.headers.get("X-Ratelimit-Remaining") || "0",
                    10,
                  )
                : undefined;

              const json = await response.json();

              if (!response.ok) {
                if (response.status === 429) {
                  return {
                    rateLimit,
                    rateLimitRemaining,
                    error: new Error(
                      "Too many requests today, please try again tomorrow!",
                    ),
                  };
                }

                throw new Error(json.message || "Generation failed...");
              }

              const generatedResponse = json.generatedResponse;
              if (!generatedResponse) {
                throw new Error("Generation failed...");
              }

              return { generatedResponse, rateLimit, rateLimitRemaining };
            } catch (err: any) {
              throw new Error("Request failed");
            }
          }}
        />
        <TTDDialogTrigger />
        {isCollaborating && isOffline && (
          <div className="collab-offline-warning">
            {t("alerts.collabOfflineWarning")}
          </div>
        )}
        {latestShareableLink && (
          <ShareableLinkDialog
            link={latestShareableLink}
            onCloseRequest={() => setLatestShareableLink(null)}
            setErrorMessage={setErrorMessage}
          />
        )}
        {excalidrawAPI && !isCollabDisabled && (
          <Collab excalidrawAPI={excalidrawAPI} />
        )}

        <ShareDialog
          collabAPI={collabAPI}
          onExportToBackend={async () => {
            if (excalidrawAPI) {
              try {
                await onExportToBackend(
                  excalidrawAPI.getSceneElements(),
                  excalidrawAPI.getAppState(),
                  excalidrawAPI.getFiles(),
                );
              } catch (error: any) {
                setErrorMessage(error.message);
              }
            }
          }}
        />

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: t("labels.liveCollaboration"),
              category: DEFAULT_CATEGORIES.app,
              keywords: [
                "team",
                "multiplayer",
                "share",
                "public",
                "session",
                "invite",
              ],
              icon: usersIcon,
              perform: () => {
                setShareDialogState({
                  isOpen: true,
                  type: "collaborationOnly",
                });
              },
            },
            {
              label: t("roomDialog.button_stopSession"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!collabAPI?.isCollaborating(),
              keywords: [
                "stop",
                "session",
                "end",
                "leave",
                "close",
                "exit",
                "collaboration",
              ],
              perform: () => {
                if (collabAPI) {
                  collabAPI.stopCollaboration();
                  if (!collabAPI.isCollaborating()) {
                    setShareDialogState({ isOpen: false });
                  }
                }
              },
            },
            {
              label: t("labels.share"),
              category: DEFAULT_CATEGORIES.app,
              predicate: true,
              icon: share,
              keywords: [
                "link",
                "shareable",
                "readonly",
                "export",
                "publish",
                "snapshot",
                "url",
                "collaborate",
                "invite",
              ],
              perform: async () => {
                setShareDialogState({ isOpen: true, type: "share" });
              },
            },
            {
              label: "GitHub",
              icon: GithubIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: [
                "issues",
                "bugs",
                "requests",
                "report",
                "features",
                "social",
                "community",
              ],
              perform: () => {
                window.open(
                  "https://github.com/excalidraw/excalidraw",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            {
              label: t("labels.followUs"),
              icon: XBrandIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["twitter", "contact", "social", "community"],
              perform: () => {
                window.open(
                  "https://x.com/excalidraw",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            {
              label: t("labels.discordChat"),
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              icon: DiscordIcon,
              keywords: [
                "chat",
                "talk",
                "contact",
                "bugs",
                "requests",
                "report",
                "feedback",
                "suggestions",
                "social",
                "community",
              ],
              perform: () => {
                window.open(
                  "https://discord.gg/UexuTaE",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            {
              label: "YouTube",
              icon: youtubeIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: ["features", "tutorials", "howto", "help", "community"],
              perform: () => {
                window.open(
                  "https://youtube.com/@excalidraw",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            ...(isExcalidrawPlusSignedUser
              ? [
                  {
                    ...ExcalidrawPlusAppCommand,
                    label: "Sign in / Go to Excalidraw+",
                  },
                ]
              : [ExcalidrawPlusCommand, ExcalidrawPlusAppCommand]),

            {
              label: t("overwriteConfirm.action.excalidrawPlus.button"),
              category: DEFAULT_CATEGORIES.export,
              icon: exportToPlus,
              predicate: true,
              keywords: ["plus", "export", "save", "backup"],
              perform: () => {
                if (excalidrawAPI) {
                  exportToExcalidrawPlus(
                    excalidrawAPI.getSceneElements(),
                    excalidrawAPI.getAppState(),
                    excalidrawAPI.getFiles(),
                    excalidrawAPI.getName(),
                  );
                }
              },
            },
            {
              ...CommandPalette.defaultItems.toggleTheme,
              perform: () => {
                setAppTheme(
                  editorTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
                );
              },
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // event cannot be reused, but we'll hopefully
                    // grab new one as the event should be fired again
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
        />
      </Excalidraw>
      {Object.keys(commentIcons || []).length > 0 && renderCommentIcons()}
      {comment && renderComment()}
      {isCommentClick && (
        <div
          style={{
            position: "absolute",
            top: 66,
            right: 0,
            zIndex: 2,
            width: "275px",
            backgroundColor: "#fff",
            borderRadius: "5px 0 0 5px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div className="comment-header">
            <div className="comment-list-header">
              <button className="comment-header-icon">
                <NewCommentIcon />
              </button>
              <div className="comment-header-title poppins-semibold">
                Comment
              </div>
            </div>
            <div
              onClick={() => setIsCommentClick(!isCommentClick)}
              className="comment-header-close-icon"
            >
              {CloseIcon}
            </div>
          </div>
          <LineBreaker />
          <div style={{ overflowY: "auto", height: "calc(100vh - 110px)" }}>
            {Object.keys(commentIcons || []).length > 0 ? (
              Object.values(commentIcons).map((singleComment) => {
                return (
                  <CommentCard
                    data={singleComment}
                    showLineBreak={true}
                    showCommentCount={!(singleComment?.replies?.length! < 1)}
                    commentCount={singleComment?.replies?.length}
                    handleMoveToComment={handleMoveToComment}
                    setEditCommentClick={setEditCommentClick}
                    setDeleteCommentClick={setDeleteCommentClick}
                    setEditComment={setEditComment}
                    editComment={editComment}
                    editCommentClick={editCommentClick}
                    setComment={setComment}
                    isEditing={singleComment?.id === editCommentClick?.id}
                    saveEditComment={saveEditComment}
                  />
                );
              })
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: "50px",
                }}
                className="poppins-regular"
              >
                No Comments
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ExcalidrawApp = () => {
  return (
    <TopErrorBoundary>
      <Provider unstable_createStore={() => appJotaiStore}>
        <ExcalidrawWrapper />
      </Provider>
    </TopErrorBoundary>
  );
};

export default ExcalidrawApp;
