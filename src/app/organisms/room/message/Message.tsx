import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  Spinner,
  Text,
  as,
  color,
  config,
} from 'folds';
import React, {
  FormEventHandler,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import FocusTrap from 'focus-trap-react';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import classNames from 'classnames';
import {
  AvatarBase,
  BubbleLayout,
  CompactLayout,
  MessageBase,
  ModernLayout,
  Time,
  Username,
} from '../../../components/message';
import colorMXID from '../../../../util/colorMXID';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../../utils/room';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { MessageLayout, MessageSpacing } from '../../../state/settings';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRecentEmoji } from '../../../hooks/useRecentEmoji';
import * as css from './styles.css';
import { EventReaders } from '../../../components/event-readers';
import { TextViewer } from '../../../components/text-viewer';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';

export type ReactionHandler = (keyOrMxc: string, shortcode: string) => void;

type MessageQuickReactionsProps = {
  onReaction: ReactionHandler;
};
export const MessageQuickReactions = as<'div', MessageQuickReactionsProps>(
  ({ onReaction, ...props }, ref) => {
    const mx = useMatrixClient();
    const recentEmojis = useRecentEmoji(mx, 4);

    if (recentEmojis.length === 0) return <span />;
    return (
      <>
        <Box
          style={{ padding: config.space.S200 }}
          alignItems="Center"
          justifyContent="Center"
          gap="200"
          {...props}
          ref={ref}
        >
          {recentEmojis.map((emoji) => (
            <IconButton
              key={emoji.unicode}
              className={css.MessageQuickReaction}
              size="300"
              variant="SurfaceVariant"
              radii="Pill"
              title={emoji.shortcode}
              aria-label={emoji.shortcode}
              onClick={() => onReaction(emoji.unicode, emoji.shortcode)}
            >
              <Text size="T500">{emoji.unicode}</Text>
            </IconButton>
          ))}
        </Box>
        <Line size="300" />
      </>
    );
  }
);

export const MessageReadReceiptItem = as<
  'button',
  {
    room: Room;
    eventId: string;
    onClose?: () => void;
  }
>(({ room, eventId, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
            }}
          >
            <Modal variant="Surface" size="300">
              <EventReaders room={room} eventId={eventId} requestClose={handleClose} />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.CheckTwice} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Read Receipts
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageSourceCodeItem = as<
  'button',
  {
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ mEvent, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const text = JSON.stringify(
    mEvent.isEncrypted()
      ? {
          [`<== DECRYPTED_EVENT ==>`]: mEvent.getEffectiveEvent(),
          [`<== ENCRYPTED_EVENT ==>`]: mEvent.event,
        }
      : mEvent.event,
    null,
    2
  );

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
            }}
          >
            <Modal variant="Surface" size="500">
              <TextViewer
                name="Source Code"
                mimeType="application/json"
                text={text}
                requestClose={handleClose}
              />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.BlockCode} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          View Source
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageDeleteItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const [open, setOpen] = useState(false);

  const [deleteState, deleteMessage] = useAsyncCallback(
    useCallback(
      (eventId: string, reason?: string) =>
        mx.redactEvent(room.roomId, eventId, undefined, reason ? { reason } : undefined),
      [mx, room]
    )
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const eventId = mEvent.getId();
    if (
      !eventId ||
      deleteState.status === AsyncStatus.Loading ||
      deleteState.status === AsyncStatus.Success
    )
      return;
    const target = evt.target as HTMLFormElement | undefined;
    const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
    const reason = reasonInput && reasonInput.value.trim();
    deleteMessage(eventId, reason);
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Delete Message</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Text priority="400">
                  This action is irreversible! Are you sure that you want to delete this message?
                </Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">
                    Reason{' '}
                    <Text as="span" size="T200">
                      (optional)
                    </Text>
                  </Text>
                  <Input name="reasonInput" variant="Background" />
                  {deleteState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      Failed to delete message! Please try again.
                    </Text>
                  )}
                </Box>
                <Button
                  type="submit"
                  variant="Critical"
                  before={
                    deleteState.status === AsyncStatus.Loading ? (
                      <Spinner fill="Soft" variant="Critical" size="200" />
                    ) : undefined
                  }
                  aria-disabled={deleteState.status === AsyncStatus.Loading}
                >
                  <Text size="B400">
                    {deleteState.status === AsyncStatus.Loading ? 'Deleting...' : 'Delete'}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Critical"
        fill="None"
        size="300"
        after={<Icon size="100" src={Icons.Delete} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Delete
        </Text>
      </Button>
    </>
  );
});

export type MessageProps = {
  room: Room;
  mEvent: MatrixEvent;
  collapse: boolean;
  highlight: boolean;
  canDelete?: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  onUserClick: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick: MouseEventHandler<HTMLButtonElement>;
  onReplyClick: MouseEventHandler<HTMLButtonElement>;
  reply?: ReactNode;
  reactions?: ReactNode;
};
export const Message = as<'div', MessageProps>(
  (
    {
      className,
      room,
      mEvent,
      collapse,
      highlight,
      canDelete,
      messageLayout,
      messageSpacing,
      onUserClick,
      onUsernameClick,
      onReplyClick,
      reply,
      reactions,
      children,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const senderId = mEvent.getSender() ?? '';
    const [hover, setHover] = useState(false);
    const [menu, setMenu] = useState(false);

    const senderDisplayName =
      getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
    const senderAvatarMxc = getMemberAvatarMxc(room, senderId);

    const headerJSX = !collapse && (
      <Box
        gap="300"
        direction={messageLayout === 1 ? 'RowReverse' : 'Row'}
        justifyContent="SpaceBetween"
        alignItems="Baseline"
        grow="Yes"
      >
        <Username
          as="button"
          style={{ color: colorMXID(senderId) }}
          data-user-id={senderId}
          onContextMenu={onUserClick}
          onClick={onUsernameClick}
        >
          <Text as="span" size={messageLayout === 2 ? 'T300' : 'T400'} truncate>
            <b>{senderDisplayName}</b>
          </Text>
        </Username>
        <Box shrink="No" gap="100">
          {messageLayout !== 1 && hover && (
            <>
              <Text as="span" size="T200" priority="300">
                {senderId}
              </Text>
              <Text as="span" size="T200" priority="300">
                |
              </Text>
            </>
          )}
          <Time ts={mEvent.getTs()} compact={messageLayout === 1} />
        </Box>
      </Box>
    );

    const avatarJSX = !collapse && messageLayout !== 1 && (
      <AvatarBase>
        <Avatar as="button" size="300" data-user-id={senderId} onClick={onUserClick}>
          {senderAvatarMxc ? (
            <AvatarImage
              src={mx.mxcUrlToHttp(senderAvatarMxc, 48, 48, 'crop') ?? senderAvatarMxc}
            />
          ) : (
            <AvatarFallback
              style={{
                background: colorMXID(senderId),
                color: 'white',
              }}
            >
              <Text size="H4">{senderDisplayName[0]}</Text>
            </AvatarFallback>
          )}
        </Avatar>
      </AvatarBase>
    );

    const msgContentJSX = (
      <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }}>
        {reply}
        {children}
        {reactions}
      </Box>
    );

    const showOptions = () => setHover(true);
    const hideOptions = () => setHover(false);

    const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
      const tag = (evt.target as any).tagName;
      if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
      evt.preventDefault();
      setMenu(true);
    };

    const closeMenu = () => {
      setMenu(false);
    };

    return (
      <MessageBase
        className={classNames(css.MessageBase, className)}
        tabIndex={0}
        space={messageSpacing}
        collapse={collapse}
        highlight={highlight}
        selected={menu}
        {...props}
        onMouseEnter={showOptions}
        onMouseLeave={hideOptions}
        ref={ref}
      >
        {(hover || menu) && (
          <div className={css.MessageOptionsBase}>
            <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
              <Box gap="100">
                <IconButton variant="SurfaceVariant" size="300" radii="300">
                  <Icon src={Icons.SmilePlus} size="100" />
                </IconButton>
                <IconButton
                  onClick={onReplyClick}
                  data-event-id={mEvent.getId()}
                  variant="SurfaceVariant"
                  size="300"
                  radii="300"
                >
                  <Icon src={Icons.ReplyArrow} size="100" />
                </IconButton>
                <PopOut
                  open={menu}
                  alignOffset={-5}
                  position="Bottom"
                  align="End"
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenu(false),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                      }}
                    >
                      <Menu {...props} ref={ref}>
                        <MessageQuickReactions
                          onReaction={(a, b) => {
                            alert(`Work in Progress! ${a}: ${b}`);
                            closeMenu();
                          }}
                        />
                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          <MenuItem
                            size="300"
                            after={<Icon size="100" src={Icons.SmilePlus} />}
                            radii="300"
                            onClick={() => alert('Work in Progress!')}
                          >
                            <Text
                              className={css.MessageMenuItemText}
                              as="span"
                              size="T300"
                              truncate
                            >
                              Add Reaction
                            </Text>
                          </MenuItem>
                          <MenuItem
                            size="300"
                            after={<Icon size="100" src={Icons.ReplyArrow} />}
                            radii="300"
                            data-event-id={mEvent.getId()}
                            onClick={(evt: any) => {
                              onReplyClick(evt);
                              closeMenu();
                            }}
                          >
                            <Text
                              className={css.MessageMenuItemText}
                              as="span"
                              size="T300"
                              truncate
                            >
                              Reply
                            </Text>
                          </MenuItem>
                          <MessageReadReceiptItem
                            room={room}
                            eventId={mEvent.getId() ?? ''}
                            onClose={closeMenu}
                          />
                          <MessageSourceCodeItem mEvent={mEvent} onClose={closeMenu} />
                        </Box>
                        <Line size="300" />

                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          {!mEvent.isRedacted() && canDelete && (
                            <MessageDeleteItem room={room} mEvent={mEvent} onClose={closeMenu} />
                          )}
                          <Button
                            variant="Critical"
                            fill="None"
                            size="300"
                            after={<Icon size="100" src={Icons.Warning} />}
                            radii="300"
                            onClick={() => alert('Work in Progress!')}
                          >
                            <Text
                              className={css.MessageMenuItemText}
                              as="span"
                              size="T300"
                              truncate
                            >
                              Report
                            </Text>
                          </Button>
                        </Box>
                      </Menu>
                    </FocusTrap>
                  }
                >
                  {(targetRef) => (
                    <IconButton
                      ref={targetRef}
                      variant="SurfaceVariant"
                      size="300"
                      radii="300"
                      onClick={() => setMenu((v) => !v)}
                      aria-pressed={menu}
                    >
                      <Icon src={Icons.VerticalDots} size="100" />
                    </IconButton>
                  )}
                </PopOut>
              </Box>
            </Menu>
          </div>
        )}
        {messageLayout === 1 && (
          <CompactLayout before={headerJSX} onContextMenu={handleContextMenu}>
            {msgContentJSX}
          </CompactLayout>
        )}
        {messageLayout === 2 && (
          <BubbleLayout before={avatarJSX} onContextMenu={handleContextMenu}>
            {headerJSX}
            {msgContentJSX}
          </BubbleLayout>
        )}
        {messageLayout !== 1 && messageLayout !== 2 && (
          <ModernLayout before={avatarJSX} onContextMenu={handleContextMenu}>
            {headerJSX}
            {msgContentJSX}
          </ModernLayout>
        )}
      </MessageBase>
    );
  }
);
