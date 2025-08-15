import React, { ReactNode, RefObject, useCallback, useRef, useState } from 'react';
import { MatrixError, Room } from 'matrix-js-sdk';
import {
    Avatar,
    Box,
    Text,
    as,
} from 'folds'; // A component library for building UIs.
import classNames from 'classnames';
import * as css from './style.css'; // Importing CSS styles.
import { RoomAvatar } from '../room-avatar';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { nameInitials } from '../../utils/common';
import { millify } from '../../plugins/millify'; // A utility to format large numbers (e.g., 10000 -> 10k).
import { useMatrixClient } from '../../hooks/useMatrixClient'; // A custom hook for accessing the Matrix client instance.
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback'; // A custom hook for managing asynchronous operations with loading/error states.
import { onEnterOrSpace } from '../../utils/keyboard'; // A utility for keyboard accessibility.
import { RoomType, StateEvent } from '../../../types/matrix/room';
import { useJoinedRoomId } from '../../hooks/useJoinedRoomId';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import { getRoomAvatarUrl, getStateEvent } from '../../utils/room';
import { useStateEventCallback } from '../../hooks/useStateEventCallback'; // A custom hook for listening to specific Matrix state events.
import { getText } from '../../../lang';
import Icon from '@mdi/react'; // Library for Material Design Icons.
import { mdiAccount } from '@mdi/js';
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, PaperProps, useTheme } from '@mui/material'; // Material-UI components.
import Grid2 from '@mui/material/Unstable_Grid2'; // Material-UI's Grid2 component from its unstable module.
import { LoadingButton } from '@mui/lab'; // Material-UI lab component for buttons with loading state.

// A component to wrap room cards in a Material-UI Grid container.
export function RoomCardGrid({ children }: { children: ReactNode }) {
    return (
        <Grid2 container spacing={2}>
            {children}
        </Grid2>
    );
}

// A base component for the RoomCard, using Material-UI's Paper for styling.
export const RoomCardBase = React.forwardRef<HTMLDivElement, PaperProps>((props: PaperProps, ref) => {
    const theme = useTheme();
    return (
        <Paper
            {...props}
            sx={{
                flexDirection: 'column',
                gap: theme.spacing(2),
                display: 'flex',
                padding: theme.spacing(3),
                borderRadius: theme.shape.borderRadius,
                ...props.sx
            }}
            ref={ref || undefined} // Passes the ref to the Paper component.
        />
    );
});

// A component for the room name, using 'folds' Text component with a 'h6' tag.
export const RoomCardName = as<'h6'>(({ ...props }, ref) => (
    <Text as="h6" size="H6" truncate {...props} ref={ref} />
));

// A component for the room topic, with styling and keyboard accessibility.
export const RoomCardTopic = as<'p'>(({ className, ...props }, ref) => (
    <Text
        as="p"
        size="T200"
        className={classNames(css.RoomCardTopic, className)}
        {...props}
        priority="400"
        ref={ref}
    />
));

// A reusable component for an error dialog box.
function ErrorDialog({
    title,
    message,
    children,
}: {
    title: string;
    message: string;
    children: (openError: () => void) => ReactNode;
}) {
    const [viewError, setViewError] = useState(false);
    const closeError = () => setViewError(false);
    const openError = () => setViewError(true);

    return (
        <>
            {children(openError)}
            <Dialog open={viewError} onClose={closeError}>
                <DialogTitle>
                    {title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeError}>
                        {getText('btn.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// Props for the main RoomCard component.
type RoomCardProps = {
    roomIdOrAlias: string;
    allRooms: string[];
    avatarUrl?: string;
    name?: string;
    topic?: string;
    memberCount?: number;
    roomType?: string;
    knock?: boolean;
    onView?: (roomId: string) => void;
    renderTopicViewer: (name: string, topic: string, requestClose: () => void) => ReactNode;
};

// The main RoomCard component.
export const RoomCard = as<'div', RoomCardProps>(
    (
        {
            roomIdOrAlias,
            allRooms,
            avatarUrl,
            name,
            topic,
            memberCount,
            roomType,
            onView,
            renderTopicViewer,
            knock,
            ...props
        },
        ref
    ) => {
        // Hooks to get the Matrix client instance and check if the user is in the room.
        const mx = useMatrixClient();
        const joinedRoomId = useJoinedRoomId(allRooms, roomIdOrAlias);
        const joinedRoom = mx.getRoom(joinedRoomId);

        // State to hold the room's topic, with a listener for real-time updates.
        const [topicEvent, setTopicEvent] = useState(() =>
            joinedRoom ? getStateEvent(joinedRoom, StateEvent.RoomTopic) : undefined
        );

        // Fallback values for name and topic if not provided.
        const fallbackName = getMxIdLocalPart(roomIdOrAlias) ?? roomIdOrAlias;
        const fallbackTopic = roomIdOrAlias;

        // Logic to get the room's avatar, name, and member count.
        const avatar = joinedRoom
            ? getRoomAvatarUrl(mx, joinedRoom, 96)
            : avatarUrl && mxcUrlToHttp(mx, avatarUrl, 96, 96, 'crop');

        const roomName = joinedRoom?.name || name || fallbackName;
        const roomTopic =
            (topicEvent?.getContent().topic as string) || undefined || topic || fallbackTopic;
        const joinedMemberCount = joinedRoom?.getJoinedMemberCount() ?? memberCount;

        // Custom hook to listen for changes to the room's topic state event.
        useStateEventCallback(
            mx,
            useCallback(
                (event) => {
                    if (
                        joinedRoom &&
                        event.getRoomId() === joinedRoom.roomId &&
                        event.getType() === StateEvent.RoomTopic
                    ) {
                        setTopicEvent(getStateEvent(joinedRoom, StateEvent.RoomTopic));
                    }
                },
                [joinedRoom]
            )
        );

        // Hook for handling the "join room" asynchronous operation.
        const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
            useCallback(() => {
                return mx.joinRoom(roomIdOrAlias);
            }, [mx, roomIdOrAlias])
        );
        const joining =
            joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;

        // Hook for handling the "knock room" asynchronous operation.
        const [knockState, knockRoom] = useAsyncCallback<{ room_id: string }, MatrixError, []>(
            useCallback(() => {
                return mx.knockRoom(roomIdOrAlias);
            }, [mx, roomIdOrAlias])
        );
        const knocking =
            knockState.status === AsyncStatus.Loading || knockState.status === AsyncStatus.Success;

        // State and handlers for the topic viewer dialog.
        const [viewTopic, setViewTopic] = useState(false);
        const closeTopic = () => setViewTopic(false);
        const openTopic = () => setViewTopic(true);

        // Main component render logic.
        return (
            <RoomCardBase {...props} ref={ref}>
                {/* Header with avatar and room type chip */}
                <Box gap="200" justifyContent="SpaceBetween">
                    <Avatar size="500">
                        <RoomAvatar
                            roomId={roomIdOrAlias}
                            src={avatar ?? undefined}
                            alt={roomIdOrAlias}
                            renderFallback={() => (
                                <Text as="span" size="H3">
                                    {nameInitials(roomName)}
                                </Text>
                            )}
                        />
                    </Avatar>
                    {(roomType === RoomType.Space || joinedRoom?.isSpaceRoom()) && (
                        <Chip size='small' variant='filled' label={getText('generic.space')} />
                    )}
                </Box>
                {/* Room name and topic */}
                <Box grow="Yes" direction="Column" gap="100">
                    <RoomCardName>{roomName}</RoomCardName>
                    <RoomCardTopic onClick={openTopic} onKeyDown={onEnterOrSpace(openTopic)} tabIndex={0}>
                        {roomTopic}
                    </RoomCardTopic>

                    {/* Dialog for viewing the full topic */}
                    <Dialog open={viewTopic} onClose={closeTopic}>
                        {renderTopicViewer(roomName, roomTopic, closeTopic)}
                    </Dialog>
                </Box>
                {/* Member count */}
                {typeof joinedMemberCount === 'number' && (
                    <Box gap="100">
                        <Icon size={1} path={mdiAccount} />
                        <Text size="T200">{getText('generic.member_count', millify(joinedMemberCount))}</Text>
                    </Box>
                )}
                {/* Buttons for viewing, joining, or knocking */}
                {typeof joinedRoomId === 'string' && (
                    <Button
                        onClick={onView ? () => onView(joinedRoomId) : undefined}
                        variant="outlined"
                    >
                        {getText('btn.view')}
                    </Button>
                )}
                {typeof joinedRoomId !== 'string' && joinState.status !== AsyncStatus.Error && (
                    knock ? (
                        <LoadingButton
                            onClick={knockRoom}
                            variant='contained'
                            loading={knocking}
                        >
                            {getText(knocking ? 'room_card.knocking' : 'btn.knock')}
                        </LoadingButton>
                    ) : (
                        <LoadingButton
                            onClick={join}
                            variant='contained'
                            loading={joining}
                        >
                            {getText(joining ? 'room_card.joining' : 'btn.join')}
                        </LoadingButton>
                    )
                )}
                {/* Error handling for join/knock */}
                {typeof joinedRoomId !== 'string' && joinState.status === AsyncStatus.Error && (
                    <Box gap="200">
                        <Button
                            onClick={join}
                            color="error"
                            variant='contained'
                        >
                            {getText('btn.retry')}
                        </Button>
                        <ErrorDialog
                            title="Join Error"
                            message={joinState.error.message || getText('error.join.unknown')}
                        >
                            {(openError) => (
                                <Button
                                    onClick={openError}
                                    variant="outlined"
                                    color='error'
                                >
                                    {getText('btn.error_details')}
                                </Button>
                            )}
                        </ErrorDialog>
                    </Box>
                )}
            </RoomCardBase>
        );
    }
);
