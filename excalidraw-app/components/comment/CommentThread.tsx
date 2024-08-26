import React, { useEffect, useRef, useState } from "react";
import type { Comment } from "../../App";
import { KEYS } from "../../../packages/excalidraw/keys";
import {
  CloseIcon,
  DeleteIcon,
  EditIcon,
  SendIcon,
  ThreedotIcon,
} from "../../../packages/excalidraw/components/icons";
import { t } from "../../../packages/excalidraw/i18n";
import "./CommentThread.scss";
import { timeAgo } from "../../utils";

type CommentThreadProps = {
  commentThread: any;
  style: React.CSSProperties | undefined;
  comment: Comment;
  setComment: (comment: Comment | null) => void;
  saveComment: () => void;
  setEditCommentClick: (comment: Comment | null) => void;
  setDeleteCommentClick: (comment: Comment) => void;
  setEditComment: (comment: Comment | null) => void;
  editComment: Comment | null;
  editCommentClick: Comment | null;
  saveEditComment: () => void;
};

export const CommentInput = ({
  comment,
  setComment,
  saveComment,
  onBlur,
  autoFocus,
  isEditing,
  cancelEdit,
}: {
  comment: Comment | null;
  setComment: (comment: Comment | null) => void;
  saveComment: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  isEditing?: boolean;
  cancelEdit?: () => void;
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setTimeout(() => {
      if (autoFocus && textAreaRef.current) {
        textAreaRef.current.focus();
      }
    });
  }, [autoFocus]);

  const handleCancel = () => {
    cancelEdit && cancelEdit();
  };

  return (
    <div className="comment-input-container">
      <textarea
        className="comment-input"
        ref={textAreaRef}
        placeholder={comment?.value ? "Reply" : "Add a comment"}
        value={comment?.value}
        onChange={(event) => {
          comment && setComment({ ...comment, value: event.target.value });
        }}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === KEYS.ENTER) {
            event.preventDefault();
            saveComment();
          } else if (event.key === KEYS.ESCAPE) {
            handleCancel();
          }
        }}
      />
      {isEditing && (
        <div className="comment-close-icon" onClick={handleCancel}>
          {CloseIcon}
        </div>
      )}
      <button className="comment-send-button" onClick={saveComment}>
        <SendIcon />
      </button>
    </div>
  );
};

export const CommentMenu = ({
  setEditCommentClick,
  setDeleteCommentClick,
  comment,
  setEditComment,
}: {
  comment: Comment;
  setEditCommentClick: (comment: Comment) => void;
  setDeleteCommentClick: (comment: Comment) => void;
  setEditComment: (editComment: Comment | null) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = () => {
    setShowMenu((prev) => !prev);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEdit = () => {
    setEditCommentClick(comment);
    setEditComment(comment);
    setShowMenu(false);
  };

  const handleDelete = () => {
    setDeleteCommentClick(comment);
    setShowMenu(false);
  };

  return (
    <div className="threedot-icon-wrapper" ref={menuRef}>
      <button onClick={toggleMenu} className="comment-threedot-icon">
        <ThreedotIcon />
      </button>
      {showMenu && (
        <div className="threedot-icon-menu">
          <button className="menu-btn" onClick={handleEdit}>
            <div>
              <EditIcon />
            </div>
            <div style={{ marginLeft: "4px" }}>Edit</div>
          </button>
          <button className="menu-btn" onClick={handleDelete}>
            <div>
              <DeleteIcon />
            </div>
            <div style={{ marginLeft: "4px" }}>Delete</div>
          </button>
        </div>
      )}
    </div>
  );
};

export const CommentCard = ({
  data,
  showLineBreak,
  showCommentCount,
  commentCount,
  handleMoveToComment,
  setEditCommentClick,
  setDeleteCommentClick,
  setEditComment,
  editCommentClick,
  editComment,
  setComment,
  isEditing,
  saveEditComment,
}: {
  data: any;
  showLineBreak?: boolean;
  showCommentCount?: boolean;
  commentCount?: number;
  editComment: Comment | null;
  editCommentClick: Comment | null;
  handleMoveToComment?: (
    e: React.MouseEvent<HTMLDivElement>,
    comment: Comment,
  ) => void;
  setEditCommentClick: (comment: Comment | null) => void;
  setDeleteCommentClick: (comment: Comment) => void;
  setEditComment: (editComment: Comment | null) => void;
  setComment: (comment: Comment | null) => void;
  isEditing: boolean;
  saveEditComment: () => void;
}) => {
  return (
    <div className="comment-card-wrapper">
      <div className="comment-card-header-wrapper">
        <div className="comment-card-header">
          <div style={{ marginRight: "8px" }}>
            <img
              src={data.user?.image || "https://via.placeholder.com/40"}
              alt="avatar"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
              }}
            />
          </div>
          <div className="card-header-name">
            <div>{data.user?.name}</div>
            <div>{data.user?.company?.name}</div>
          </div>
          <div className="card-header-date">
            {timeAgo(new Date(data.created_at))}
          </div>
        </div>
        <CommentMenu
          comment={data}
          setDeleteCommentClick={setDeleteCommentClick}
          setEditCommentClick={setEditCommentClick}
          setEditComment={setEditComment}
        />
      </div>
      {isEditing ? (
        <div>
          <CommentInput
            comment={editComment}
            setComment={setEditComment}
            saveComment={saveEditComment}
            autoFocus={true}
            isEditing={isEditing}
            cancelEdit={() => setEditCommentClick(null)}
          />
        </div>
      ) : (
        <div className="comment-value-wrapper">
          <p className="comment-value">{data.value}</p>
        </div>
      )}
      {showCommentCount && (
        <div
          onClick={(e) => handleMoveToComment && handleMoveToComment(e, data)}
          className="comment-count-wrapper"
        >
          <div className="comment-count">{commentCount} reply</div>
        </div>
      )}

      {/* {showLineBreak && <LineBreaker />} */}
    </div>
  );
};

export const LineBreaker = ({
  style,
}: {
  style?: React.CSSProperties | undefined;
}) => {
  return (
    <div
      style={{
        ...style,
        borderBottom: "1px solid var(--Greyscale-200, #DCE0E3)",
      }}
    ></div>
  );
};

const CommentThread = ({
  commentThread,
  style,
  comment,
  setComment,
  saveComment,
  setEditCommentClick,
  setDeleteCommentClick,
  setEditComment,
  editComment,
  editCommentClick,
  saveEditComment,
}: CommentThreadProps) => {
  return (
    <div
      style={{
        ...style,
        position: "absolute",
        zIndex: 2,
        background: "#FFFFFF",
        borderRadius: "16px",
        boxShadow: "0px 1px 5px 0px #0000002E",
        width: "320px",
      }}
    >
      <div
        style={{
          height: "36px",
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
        }}
      >
        <div
          onClick={() => setComment(null)}
          style={{ marginRight: "12px", height: "20px", width: "20px" }}
        >
          {CloseIcon}
        </div>
      </div>
      <LineBreaker />
      <div style={{ overflowY: "auto", maxHeight: "300px" }}>
        <CommentCard
          data={commentThread}
          setEditCommentClick={setEditCommentClick}
          setDeleteCommentClick={setDeleteCommentClick}
          setEditComment={setEditComment}
          editComment={editComment}
          editCommentClick={editCommentClick}
          setComment={setComment}
          isEditing={commentThread?.id === editCommentClick?.id}
          saveEditComment={saveEditComment}
        />
        {/* <LineBreaker /> */}
        {commentThread.replies!?.length > 0 &&
          commentThread.replies!.map(
            (reply: Comment, index: React.Key | null | undefined) => (
              <div key={index}>
                <CommentCard
                  data={reply}
                  setEditCommentClick={setEditCommentClick}
                  setDeleteCommentClick={setDeleteCommentClick}
                  setEditComment={setEditComment}
                  editComment={editComment}
                  editCommentClick={editCommentClick}
                  setComment={setComment}
                  isEditing={reply?.id === editCommentClick?.id}
                  saveEditComment={saveEditComment}
                />
                {/* <LineBreaker /> */}
              </div>
            ),
          )}
      </div>
      <div style={{ padding: "0px 12px 12px 12px" }}>
        <CommentInput
          comment={comment}
          setComment={setComment}
          saveComment={saveComment}
          autoFocus={true}
        />
      </div>
    </div>
  );
};

export default CommentThread;
