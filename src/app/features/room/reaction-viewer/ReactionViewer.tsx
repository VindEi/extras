import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import {
    Avatar,
    Box,
    Scroll,
    Text,
    as,
    config,
} from 'folds';
import { MatrixEvent, Room, RoomMember } from 'matrix-js-sdk';
import { Relations } from 'matrix-js-sdk/lib/models/relations';
import { getMemberDisplayName } from '../../../utils/room';
import { eventWithShortcode, getMxIdLocalPart } from '../../../utils/matrix';
import * as css from './ReactionViewer.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { openProfileViewer } from '../../../../client/action/navigation';
import { useRelations } from '../../../hooks/useRelations';
import { Reaction } from '../../../components/message';
import { getHexcodeForEmoji, getShortcodeFor } from '../../../plugins/emoji';
import { UserAvatar } from '../../../components/user-avatar';
import { getText } from '../../../../lang';
import Icon from '@mdi/react';
import { mdiAccount, mdiClose } from '@mdi/js';
import { AppBar, Divider, IconButton, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';

export type ReactionViewerProps = {
    room: Room;
    initialKey?: string;
    relations: Relations;
    requestClose: () => void;
};
export const ReactionViewer = as<'div', ReactionViewerProps>(
    ({ className, room, initialKey, relations, requestClose, ...props }, ref) => {
        const mx = useMatrixClient();
        const reactions = useRelations(
            relations,
            useCallback((rel) => [...(rel.getSortedAnnotationsByKey() ?? [])], [])
        );

        const [selectedKey, setSelectedKey] = useState<string>(() => {
            if (initialKey) return initialKey;
            const defaultReaction = reactions.find((reaction) => typeof reaction[0] === 'string');
            return defaultReaction ? defaultReaction[0] : '';
        });

        const getName = (member: RoomMember) =>
            getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

        const getReactionsForKey = (key: string): MatrixEvent[] => {
            const reactSet = reactions.find(([k]) => k === key)?.[1];
            if (!reactSet) return [];
            return Array.from(reactSet);
        };

        const selectedReactions = getReactionsForKey(selectedKey);
        const selectedShortcode =
            selectedReactions.find(eventWithShortcode)?.getContent().shortcode ??
            getShortcodeFor(getHexcodeForEmoji(selectedKey)) ??
            selectedKey;

        return (
            <Box
                className={classNames(css.ReactionViewer, className)}
                direction="Row"
                {...props}
                ref={ref}
            >
                <Box shrink="No" className={css.Sidebar}>
                    <Scroll visibility="Hover" hideTrack size="300">
                        <Box className={css.SidebarContent} direction="Column" gap="200">
                            {reactions.map(([key, evts]) => {
                                if (typeof key !== 'string') return null;
                                return (
                                    <Reaction
                                        key={key}
                                        mx={mx}
                                        reaction={key}
                                        count={evts.size}
                                        aria-selected={key === selectedKey}
                                        onClick={() => setSelectedKey(key)}
                                    />
                                );
                            })}
                        </Box>
                    </Scroll>
                </Box>
                <Divider orientation='vertical' />
                <Box grow="Yes" direction="Column">
                    <AppBar position='relative'>
                        <Toolbar>
                            <Typography component='div' variant='h6' flexGrow={1}>{getText('reaction_viewer.reacted_with', selectedShortcode)}</Typography>
                            <IconButton
                                size='large'
                                edge='end'
                                onClick={requestClose}
                            >
                                <Close />
                            </IconButton>
                        </Toolbar>
                    </AppBar>

                    <List>
                        {selectedReactions.map((mEvent) => {
                            const senderId = mEvent.getSender();
                            if (!senderId) return null;
                            const member = room.getMember(senderId);
                            const name = (member ? getName(member) : getMxIdLocalPart(senderId)) ?? senderId;

                            const avatarUrl = member?.getAvatarUrl(
                                mx.baseUrl,
                                100,
                                100,
                                'crop',
                                undefined,
                                false
                            );

                            return (
                                <ListItem
                                    key={senderId}
                                    onClick={() => {
                                        requestClose();
                                        openProfileViewer(senderId, room.roomId);
                                    }}
                                >
                                    <ListItemIcon>
                                        <Avatar size="200">
                                            <UserAvatar
                                                userId={senderId}
                                                src={avatarUrl ?? undefined}
                                                alt={name}
                                                renderFallback={() => <Icon size={1} path={mdiAccount} />}
                                            />
                                        </Avatar>
                                    </ListItemIcon>
                                    <ListItemText>
                                        {name}
                                    </ListItemText>
                                </ListItem>
                            );
                        })}
                    </List>
                </Box>
            </Box>
        );
    }
);
