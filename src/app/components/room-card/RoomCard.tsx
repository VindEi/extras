import React, { useCallback, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// We're mocking the external dependencies to create a standalone, runnable app.
// In a real application, these would be imported from your project's libraries and files.

// --- MOCK COMPONENTS AND UTILITIES ---

// Mocking 'folds' library components with Tailwind CSS for a similar look and feel.
const Text = ({ as = 'span', className, children, ...props }) => {
  const Tag = as;
  return <Tag className={`font-inter ${className}`} {...props}>{children}</Tag>;
};

const Box = ({ children, gap, direction = 'row', className, ...props }) => {
  const gapClass = gap ? `gap-${Math.floor(parseInt(gap, 10) / 4)}` : '';
  const directionClass = direction === 'Column' ? 'flex-col' : 'flex-row';
  return (
    <div className={`flex ${directionClass} ${gapClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

const Avatar = ({ size, children }) => {
  const sizeMap = {
    '500': 'h-12 w-12',
  };
  const sizeClass = sizeMap[size] || 'h-10 w-10';
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center bg-gray-200`}>
      {children}
    </div>
  );
};

const as = (Component) => Component;

// Mocking the imported CSS with inline Tailwind classes.
const css = {
  RoomCardTopic: 'cursor-pointer hover:underline',
};

// Mocking the other utility functions
const getMxIdLocalPart = (id) => id.split(':')[0].substring(1);
const mxcUrlToHttp = (mx, url, w, h) => `https://placehold.co/${w}x${h}/e0e0e0/555?text=${url}`;
const nameInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase();
const millify = (num) => {
  if (num > 999) return (num / 1000).toFixed(1) + 'k';
  return num;
};

// Mocking the keyboard utility
const onEnterOrSpace = (callback) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    callback();
  }
};

// Mocking the translation function
const getText = (key, ...args) => {
  const strings = {
    'generic.space': 'Space',
    'generic.member_count': `${args[0]} members`,
    'btn.view': 'View',
    'room_card.knocking': 'Knocking...',
    'btn.knock': 'Knock',
    'room_card.joining': 'Joining...',
    'btn.join': 'Join',
    'btn.retry': 'Retry',
    'btn.error_details': 'Error Details',
    'btn.cancel': 'Cancel',
    'error.join.unknown': 'An unknown error occurred.',
  };
  return strings[key] || key;
};

// Mocking the Matrix-related hooks
const useMatrixClient = () => ({
  // Dummy client methods
  joinRoom: (roomId) => new Promise(resolve => setTimeout(() => resolve({ roomId }), 1500)),
  knockRoom: (roomId) => new Promise(resolve => setTimeout(() => resolve({ room_id: roomId }), 1500)),
  getRoom: (roomId) => {
    // Mock a room object for a joined room
    if (roomId === '!mockedRoom:server.com') {
      return {
        roomId,
        name: 'Mocked Room',
        getJoinedMemberCount: () => 1234,
        isSpaceRoom: () => false,
      };
    }
    return null;
  }
});
const useJoinedRoomId = (allRooms, roomIdOrAlias) => {
  return allRooms.includes(roomIdOrAlias) ? roomIdOrAlias : null;
};
const useAsyncCallback = (fn) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const callback = useCallback(async (...args) => {
    setStatus('loading');
    setError(null);
    try {
      const result = await fn(...args);
      setStatus('success');
      return result;
    } catch (err) {
      setStatus('error');
      setError(err);
    }
  }, [fn]);
  return [{ status, error }, callback];
};
const useStateEventCallback = (mx, cb) => {
  // We'll just mock this with a simple effect for demonstration.
  // In a real app, it would listen to client events.
  useEffect(() => {
    // Simulate a topic change after a delay
    const timer = setTimeout(() => {
      const mockEvent = {
        getRoomId: () => '!mockedRoom:server.com',
        getType: () => 'm.room.topic',
        getContent: () => ({ topic: 'This is a new mocked topic!' }),
      };
      cb(mockEvent);
    }, 5000);
    return () => clearTimeout(timer);
  }, [cb]);
};
const getRoomAvatarUrl = (mx, room) => 'https://placehold.co/96x96/444/fff?text=Avatar';
const getStateEvent = (room, eventType) => ({
  getContent: () => ({ topic: 'An example room topic.' })
});

// Mock Material-UI components with Tailwind.
const Paper = ({ children, sx }) => <div className="bg-white p-6 rounded-xl shadow-lg my-4 flex flex-col gap-4" style={sx}>{children}</div>;
const Chip = ({ label }) => <div className="bg-gray-100 px-2 py-1 rounded-full text-xs font-semibold">{label}</div>;
const Button = ({ children, onClick, variant = 'outlined', color, ...props }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-bold transition-colors";
  const variantClasses = variant === 'outlined' ? 'border border-gray-400 text-gray-700 hover:bg-gray-100' : 'bg-blue-500 text-white hover:bg-blue-600';
  const colorClass = color === 'error' ? 'bg-red-500 text-white hover:bg-red-600' : '';
  return <button className={`${baseClasses} ${variantClasses} ${colorClass}`} onClick={onClick} {...props}>{children}</button>;
};

const Dialog = ({ open, children, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-xl">
        {children}
      </div>
    </div>
  );
};
const DialogTitle = ({ children }) => <h2 className="text-xl font-bold mb-2">{children}</h2>;
const DialogContent = ({ children }) => <div className="text-gray-700">{children}</div>;
const DialogContentText = ({ children }) => <p className="mb-4">{children}</p>;
const DialogActions = ({ children }) => <div className="flex justify-end gap-2 mt-4">{children}</div>;

const LoadingButton = ({ children, loading, ...props }) => {
  const loadingText = loading ? 'Loading...' : children;
  return <Button disabled={loading} {...props}>{loadingText}</Button>;
};

const Grid2 = ({ children, container, spacing }) => {
  return <div className="flex flex-wrap -m-2">{children}</div>;
};

// Mock Material Design Icon
const Icon = ({ path, size }) => {
  // Using a simple emoji as a placeholder for the icon
  const iconMap = {
    'mdiAccount': '👤',
  };
  return <span style={{ fontSize: `${size}em` }}>{iconMap[path]}</span>;
};

// --- MOCK DATA ---
const roomData = [
  {
    roomIdOrAlias: '!mockedRoom:server.com',
    allRooms: ['!mockedRoom:server.com'],
    name: 'Main Chat Room',
    topic: 'A general chat for everyone.',
    memberCount: 5200,
    roomType: 'm.space',
    knock: false,
    onView: (id) => alert(`Viewing room: ${id}`),
    renderTopicViewer: (name, topic, onClose) => (
      <div>
        <DialogTitle>{name}</DialogTitle>
        <DialogContent>
          <DialogContentText>{topic}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </div>
    )
  },
  {
    roomIdOrAlias: '#private-room:server.com',
    allRooms: [],
    name: 'Private Room',
    topic: 'Shhh, this is a secret room.',
    memberCount: 15,
    knock: true,
    renderTopicViewer: (name, topic, onClose) => (
      <div>
        <DialogTitle>{name}</DialogTitle>
        <DialogContent>
          <DialogContentText>{topic}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </div>
    )
  },
  {
    roomIdOrAlias: '#unjoined-room:server.com',
    allRooms: [],
    name: 'Open Discussion',
    topic: 'Feel free to join the conversation.',
    memberCount: 247,
    knock: false,
    renderTopicViewer: (name, topic, onClose) => (
      <div>
        <DialogTitle>{name}</DialogTitle>
        <DialogContent>
          <DialogContentText>{topic}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </div>
    )
  },
];

// --- MAIN COMPONENTS ---

// A component to wrap room cards in a Material-UI Grid container.
// This is a simplified version using Tailwind flexbox.
export function RoomCardGrid({ children }) {
    return (
        <div className="flex flex-wrap gap-4 p-4">
            {children}
        </div>
    );
}

// A base component for the RoomCard, using a simple div for styling.
export const RoomCardBase = React.forwardRef(({ children, ...props }, ref) => {
    return (
        <div 
          ref={ref} 
          className="flex flex-col gap-4 p-6 rounded-lg shadow-lg bg-white w-full sm:w-1/2 md:w-1/3 lg:w-1/4" 
          {...props}
        >
          {children}
        </div>
    );
});

// A component for the room name.
export const RoomCardName = ({ children, ...props }) => (
  <h6 className="text-lg font-bold truncate" {...props}>{children}</h6>
);

// A component for the room topic.
export const RoomCardTopic = ({ className, children, ...props }) => (
  <p 
    className={`${css.RoomCardTopic} text-sm text-gray-600 line-clamp-2`}
    {...props}
  >
    {children}
  </p>
);

// A reusable component for an error dialog box.
function ErrorDialog({
    title,
    message,
    children,
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

// The main RoomCard component.
const RoomCard = ({
    roomIdOrAlias,
    allRooms,
    avatarUrl,
    name,
    topic,
    memberCount,
    roomType,
    knock,
    onView,
    renderTopicViewer,
}) => {
        // Hooks to get the Matrix client instance and check if the user is in the room.
        const mx = useMatrixClient();
        const joinedRoomId = useJoinedRoomId(allRooms, roomIdOrAlias);
        const joinedRoom = mx.getRoom(joinedRoomId);

        // State to hold the room's topic, with a listener for real-time updates.
        const [topicEvent, setTopicEvent] = useState(() =>
            joinedRoom ? getStateEvent(joinedRoom, 'm.room.topic') : undefined
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
            (topicEvent?.getContent().topic) || undefined || topic || fallbackTopic;
        const joinedMemberCount = joinedRoom?.getJoinedMemberCount() ?? memberCount;

        // Custom hook to listen for changes to the room's topic state event.
        useStateEventCallback(
            mx,
            useCallback(
                (event) => {
                    if (
                        joinedRoom &&
                        event.getRoomId() === joinedRoom.roomId &&
                        event.getType() === 'm.room.topic'
                    ) {
                        setTopicEvent(getStateEvent(joinedRoom, 'm.room.topic'));
                    }
                },
                [joinedRoom]
            )
        );

        // Hook for handling the "join room" asynchronous operation.
        const [joinState, join] = useAsyncCallback(
            useCallback(() => {
                // Simulate an error for demonstration
                if (roomIdOrAlias.includes('unjoined')) {
                  return new Promise((resolve, reject) => setTimeout(() => reject(new Error('This is a simulated error')), 1500));
                }
                return mx.joinRoom(roomIdOrAlias);
            }, [mx, roomIdOrAlias])
        );
        const joining =
            joinState.status === 'loading' || joinState.status === 'success';

        // Hook for handling the "knock room" asynchronous operation.
        const [knockState, knockRoom] = useAsyncCallback(
            useCallback(() => {
                return mx.knockRoom(roomIdOrAlias);
            }, [mx, roomIdOrAlias])
        );
        const knocking =
            knockState.status === 'loading' || knockState.status === 'success';

        // State and handlers for the topic viewer dialog.
        const [viewTopic, setViewTopic] = useState(false);
        const closeTopic = () => setViewTopic(false);
        const openTopic = () => setViewTopic(true);

        return (
            <RoomCardBase>
                <Box gap="200" className="justify-between">
                    <Avatar size="500">
                        <Text as="span" size="H3">
                            {nameInitials(roomName)}
                        </Text>
                    </Avatar>
                    {(roomType === 'm.space' || joinedRoom?.isSpaceRoom()) && (
                        <Chip label={getText('generic.space')} />
                    )}
                </Box>
                <Box className="flex-grow flex-col gap-1">
                    <RoomCardName>{roomName}</RoomCardName>
                    <RoomCardTopic onClick={openTopic} onKeyDown={onEnterOrSpace(openTopic)} tabIndex={0}>
                        {roomTopic}
                    </RoomCardTopic>

                    <Dialog open={viewTopic} onClose={closeTopic}>
                        {renderTopicViewer(roomName, roomTopic, closeTopic)}
                    </Dialog>
                </Box>
                {typeof joinedMemberCount === 'number' && (
                    <Box gap="100" className="items-center">
                        <Icon size={1} path={'mdiAccount'} />
                        <Text size="T200">{getText('generic.member_count', millify(joinedMemberCount))}</Text>
                    </Box>
                )}
                {typeof joinedRoomId === 'string' && (
                    <Button
                        onClick={onView ? () => onView(joinedRoomId) : undefined}
                        variant="outlined"
                    >
                        {getText('btn.view')}
                    </Button>
                )}
                {typeof joinedRoomId !== 'string' && joinState.status !== 'error' && (
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
                {typeof joinedRoomId !== 'string' && joinState.status === 'error' && (
                    <Box gap="200" className="flex-row">
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

const App = () => {
    // We'll create a main component to render the RoomCards
    return (
        <div className="p-4 bg-gray-50 min-h-screen">
          <h1 className="text-3xl font-bold mb-6 text-center">Room Cards Showcase</h1>
          <RoomCardGrid>
            {roomData.map((room) => (
              <RoomCard key={room.roomIdOrAlias} {...room} />
            ))}
          </RoomCardGrid>
        </div>
    );
}

export default App;
