import React, { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
    Box,
    IconButton,
    PopOut,
    Menu,
    MenuItem,
    Text,
    RectCords,
    config,
    Line,
    Spinner,
    toRem,
} from 'folds';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { MSpaceChildContent, StateEvent } from '../../../types/matrix/room';
import {
    openInviteUser,
    openSpaceSettings,
    toggleRoomSettings,
} from '../../../client/action/navigation';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveSpacePrompt } from '../../components/leave-space-prompt';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiArrowLeft, mdiDotsVertical } from '@mdi/js';

type HierarchyItemWithParent = HierarchyItem & {
    parentId: string;
};

function SuggestMenuItem({
    item,
    requestClose,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
}) {
    const mx = useMatrixClient();
    const { roomId, parentId, content } = item;

    const [toggleState, handleToggleSuggested] = useAsyncCallback(
        useCallback(() => {
            const newContent: MSpaceChildContent = { ...content, suggested: !content.suggested };
            return mx.sendStateEvent(parentId, StateEvent.SpaceChild, newContent, roomId);
        }, [mx, parentId, roomId, content])
    );

    useEffect(() => {
        if (toggleState.status === AsyncStatus.Success) {
            requestClose();
        }
    }, [requestClose, toggleState]);

    return (
        <MenuItem
            onClick={handleToggleSuggested}
            size="300"
            radii="300"
            before={toggleState.status === AsyncStatus.Loading && <Spinner size="100" />}
            disabled={toggleState.status === AsyncStatus.Loading}
        >
            <Text as="span" size="T300">
                {getText(content.suggested ? 'btn.space_lobby.unsuggest' : 'btn.space_lobby.suggest')}
            </Text>
        </MenuItem>
    );
}

function RemoveMenuItem({
    item,
    requestClose,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
}) {
    const mx = useMatrixClient();
    const { roomId, parentId } = item;

    const [removeState, handleRemove] = useAsyncCallback(
        useCallback(
            () => mx.sendStateEvent(parentId, StateEvent.SpaceChild, {}, roomId),
            [mx, parentId, roomId]
        )
    );

    useEffect(() => {
        if (removeState.status === AsyncStatus.Success) {
            requestClose();
        }
    }, [requestClose, removeState]);

    return (
        <MenuItem
            onClick={handleRemove}
            variant="Critical"
            fill="None"
            size="300"
            radii="300"
            before={
                removeState.status === AsyncStatus.Loading && (
                    <Spinner variant="Critical" fill="Soft" size="100" />
                )
            }
            disabled={removeState.status === AsyncStatus.Loading}
        >
            <Text as="span" size="T300" truncate>
                {getText('btn.space_lobby.remove_room')}
            </Text>
        </MenuItem>
    );
}

function InviteMenuItem({
    item,
    requestClose,
    disabled,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
    disabled?: boolean;
}) {
    const handleInvite = () => {
        openInviteUser(item.roomId);
        requestClose();
    };

    return (
        <MenuItem
            onClick={handleInvite}
            size="300"
            radii="300"
            variant="Primary"
            fill="None"
            disabled={disabled}
        >
            <Text as="span" size="T300" truncate>
                {getText('btn.space_lobby.invite')}
            </Text>
        </MenuItem>
    );
}

function SettingsMenuItem({
    item,
    requestClose,
    disabled,
}: {
    item: HierarchyItemWithParent;
    requestClose: () => void;
    disabled?: boolean;
}) {
    const handleSettings = () => {
        if (item.space) {
            openSpaceSettings(item.roomId);
        } else {
            toggleRoomSettings(item.roomId);
        }
        requestClose();
    };

    return (
        <MenuItem onClick={handleSettings} size="300" radii="300" disabled={disabled}>
            <Text as="span" size="T300" truncate>
                {getText('btn.space_lobby.settings')}
            </Text>
        </MenuItem>
    );
}

type HierarchyItemMenuProps = {
    item: HierarchyItem & {
        parentId: string;
    };
    joined: boolean;
    canInvite: boolean;
    canEditChild: boolean;
    pinned?: boolean;
    onTogglePin?: (roomId: string) => void;
};
export function HierarchyItemMenu({
    item,
    joined,
    canInvite,
    canEditChild,
    pinned,
    onTogglePin,
}: HierarchyItemMenuProps) {
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
        setMenuAnchor(evt.currentTarget.getBoundingClientRect());
    };

    const handleRequestClose = useCallback(() => setMenuAnchor(undefined), []);

    if (!joined && !canEditChild) {
        return null;
    }

    return (
        <Box gap="200" alignItems="Center" shrink="No">
            <IconButton
                onClick={handleOpenMenu}
                size="300"
                variant="SurfaceVariant"
                fill="None"
                radii="300"
                aria-pressed={!!menuAnchor}
            >
               <Icon size={1} path={mdiDotsVertical} />
            </IconButton>
            {menuAnchor && (
                <PopOut
                    anchor={menuAnchor}
                    position="Bottom"
                    align="End"
                    content={
                        <FocusTrap
                            focusTrapOptions={{
                                initialFocus: false,
                                returnFocusOnDeactivate: false,
                                onDeactivate: () => setMenuAnchor(undefined),
                                clickOutsideDeactivates: true,
                                isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                                isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                            }}
                        >
                            <Menu style={{ maxWidth: toRem(150), width: '100vw' }}>
                                {joined && (
                                    <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                                        {onTogglePin && (
                                            <MenuItem
                                                size="300"
                                                radii="300"
                                                onClick={() => {
                                                    onTogglePin(item.roomId);
                                                    handleRequestClose();
                                                }}
                                            >
                                                <Text as="span" size="T300" truncate>
                                                    {getText(pinned ? 'btn.space.unpin' : 'btn.space.pin')}
                                                </Text>
                                            </MenuItem>
                                        )}
                                        <InviteMenuItem
                                            item={item}
                                            requestClose={handleRequestClose}
                                            disabled={!canInvite}
                                        />
                                        <SettingsMenuItem item={item} requestClose={handleRequestClose} />
                                        <UseStateProvider initial={false}>
                                            {(promptLeave, setPromptLeave) => (
                                                <>
                                                    <MenuItem
                                                        onClick={() => setPromptLeave(true)}
                                                        variant="Critical"
                                                        fill="None"
                                                        size="300"
                                                        after={<Icon size={1} path={mdiArrowLeft} />}
                                                        radii="300"
                                                        aria-pressed={promptLeave}
                                                    >
                                                        <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                                                            {getText('btn.leave')}
                                                        </Text>
                                                    </MenuItem>
                                                    {promptLeave &&
                                                        (item.space ? (
                                                            <LeaveSpacePrompt
                                                                roomId={item.roomId}
                                                                onDone={handleRequestClose}
                                                                onCancel={() => setPromptLeave(false)}
                                                            />
                                                        ) : (
                                                            <LeaveRoomPrompt
                                                                roomId={item.roomId}
                                                                onDone={handleRequestClose}
                                                                onCancel={() => setPromptLeave(false)}
                                                            />
                                                        ))}
                                                </>
                                            )}
                                        </UseStateProvider>
                                    </Box>
                                )}
                                {(joined || canEditChild) && (
                                    <Line size="300" variant="Surface" direction="Horizontal" />
                                )}
                                {canEditChild && (
                                    <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                                        <SuggestMenuItem item={item} requestClose={handleRequestClose} />
                                        <RemoveMenuItem item={item} requestClose={handleRequestClose} />
                                    </Box>
                                )}
                            </Menu>
                        </FocusTrap>
                    }
                />
            )}
        </Box>
    );
}
