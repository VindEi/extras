import React, {
    ChangeEventHandler,
    MouseEventHandler,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Avatar,
    Badge,
    Box,
    Chip,
    ContainerColor,
    Header,
    IconButton,
    Input,
    Menu,
    MenuItem,
    PopOut,
    RectCords,
    Scroll,
    Spinner,
    Text,
    Tooltip,
    TooltipProvider,
    config,
} from 'folds';
import { Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import classNames from 'classnames';

import { openProfileViewer } from '../../../client/action/navigation';
import * as css from './MembersDrawer.css';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Membership } from '../../../types/matrix/room';
import { UseStateProvider } from '../../components/UseStateProvider';
import {
    SearchItemStrGetter,
    UseAsyncSearchOptions,
    useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { usePowerLevelTags, PowerLevelTag } from '../../hooks/usePowerLevelTags';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName, getMemberSearchStr } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useSetSetting, useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { millify } from '../../plugins/millify';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { UserAvatar } from '../../components/user-avatar';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { usePresences } from '../../hooks/usePresences';
import { getText } from '../../../lang';
import { mdiAccount, mdiChevronUp, mdiClose, mdiFilterOutline, mdiMagnify, mdiSort } from '@mdi/js';
import Icon from '@mdi/react';

export const MembershipFilters = {
    filterJoined: (m: RoomMember) => m.membership === Membership.Join,
    filterInvited: (m: RoomMember) => m.membership === Membership.Invite,
    filterLeaved: (m: RoomMember) =>
        m.membership === Membership.Leave &&
        m.events.member?.getStateKey() === m.events.member?.getSender(),
    filterKicked: (m: RoomMember) =>
        m.membership === Membership.Leave &&
        m.events.member?.getStateKey() !== m.events.member?.getSender(),
    filterBanned: (m: RoomMember) => m.membership === Membership.Ban,
};

export type MembershipFilterFn = (m: RoomMember) => boolean;

export type MembershipFilter = {
    name: string;
    filterFn: MembershipFilterFn;
    color: ContainerColor;
    id: string;
};

// TODO: Define that shit globally, do not ^C ^V from RoomNavItem.tsx
const styles = {
    'online': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#079d16', borderRadius: '50%' },
    'offline': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#737373', borderRadius: '50%' },
    'unavailable': { borderStyle: 'solid', borderWidth: '3px', borderColor: '#b9a12d', borderRadius: '50%' }
};

const useMembershipFilterMenu = (): MembershipFilter[] =>
    useMemo(
        () => [
            {
                name: getText('members_drawer.joined'),
                id: 'joined',
                filterFn: MembershipFilters.filterJoined,
                color: 'Background',
            },
            {
                name: getText('members_drawer.invited'),
                id: 'invited',
                filterFn: MembershipFilters.filterInvited,
                color: 'Success',
            },
            {
                name: getText('members_drawer.left'),
                id: 'left',
                filterFn: MembershipFilters.filterLeaved,
                color: 'Secondary',
            },
            {
                name: getText('members_drawer.kicked'),
                id: 'kicked',
                filterFn: MembershipFilters.filterKicked,
                color: 'Warning',
            },
            {
                name: getText('members_drawer.banned'),
                id: 'banned',
                filterFn: MembershipFilters.filterBanned,
                color: 'Critical',
            },
        ],
        []
    );

export const SortFilters = {
    filterAscending: (a: RoomMember, b: RoomMember) =>
        a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1,
    filterDescending: (a: RoomMember, b: RoomMember) =>
        a.name.toLowerCase() > b.name.toLowerCase() ? -1 : 1,
    filterNewestFirst: (a: RoomMember, b: RoomMember) =>
        (b.events.member?.getTs() ?? 0) - (a.events.member?.getTs() ?? 0),
    filterOldest: (a: RoomMember, b: RoomMember) =>
        (a.events.member?.getTs() ?? 0) - (b.events.member?.getTs() ?? 0),
};

export type SortFilterFn = (a: RoomMember, b: RoomMember) => number;

export type SortFilter = {
    name: string;
    filterFn: SortFilterFn;
};

const useSortFilterMenu = (): SortFilter[] =>
    useMemo(
        () => [
            {
                name: getText('sort.a_to_z'),
                filterFn: SortFilters.filterAscending,
            },
            {
                name: getText('sort.z_to_a'),
                filterFn: SortFilters.filterDescending,
            },
            {
                name: getText('sort.newest'),
                filterFn: SortFilters.filterNewestFirst,
            },
            {
                name: getText('sort.oldest'),
                filterFn: SortFilters.filterOldest,
            },
        ],
        []
    );

export type MembersFilterOptions = {
    membershipFilter: MembershipFilter;
    sortFilter: SortFilter;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
    limit: 100,
    matchOptions: {
        contain: true,
    },
};

const mxIdToName = (mxId: string) => getMxIdLocalPart(mxId) ?? mxId;
const getRoomMemberStr: SearchItemStrGetter<RoomMember> = (m, query) =>
    getMemberSearchStr(m, query, mxIdToName);

type MembersDrawerProps = {
    room: Room;
};
export function MembersDrawer({ room }: MembersDrawerProps) {
    const mx = useMatrixClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
    const members = useRoomMembers(mx, room.roomId);
    const getPowerLevelTag = usePowerLevelTags();
    const fetchingMembers = members.length < room.getJoinedMemberCount();
    const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

    const membershipFilterMenu = useMembershipFilterMenu();
    const sortFilterMenu = useSortFilterMenu();
    const [sortFilterIndex, setSortFilterIndex] = useSetting(settingsAtom, 'memberSortFilterIndex');
    const [membershipFilterIndex, setMembershipFilterIndex] = useState(0);

    const membershipFilter = membershipFilterMenu[membershipFilterIndex] ?? membershipFilterMenu[0];
    const sortFilter = sortFilterMenu[sortFilterIndex] ?? sortFilterMenu[0];

    const typingMembers = useRoomTypingMember(room.roomId);

    const filteredMembers = useMemo(
        () =>
            members
                .filter(membershipFilter.filterFn)
                .sort(sortFilter.filterFn)
                .sort((a, b) => b.powerLevel - a.powerLevel),
        [members, membershipFilter, sortFilter]
    );

    const [result, search, resetSearch] = useAsyncSearch(
        filteredMembers,
        getRoomMemberStr,
        SEARCH_OPTIONS
    );
    if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

    const processMembers = result ? result.items : filteredMembers;

    const PLTagOrRoomMember = useMemo(() => {
        let prevTag: PowerLevelTag | undefined;
        const tagOrMember: Array<PowerLevelTag | RoomMember> = [];
        processMembers.forEach((m) => {
            const plTag = getPowerLevelTag(m.powerLevel);
            if (plTag !== prevTag) {
                prevTag = plTag;
                tagOrMember.push(plTag);
            }
            tagOrMember.push(m);
        });
        return tagOrMember;
    }, [processMembers, getPowerLevelTag]);

    const virtualizer = useVirtualizer({
        count: PLTagOrRoomMember.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 40,
        overscan: 10,
    });

    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
        useCallback(
            (evt) => {
                if (evt.target.value) search(evt.target.value);
                else resetSearch();
            },
            [search, resetSearch]
        ),
        { wait: 200 }
    );

    const getName = (member: RoomMember) =>
        getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

    const handleMemberClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
        const btn = evt.currentTarget as HTMLButtonElement;
        const userId = btn.getAttribute('data-user-id');
        openProfileViewer(userId, room.roomId);
    };

    const getPresenceFn = usePresences();

    const [avStyles, setAvStyles]: [Record<string, any>, any] = useState({});
    const [statusMsgs, setStatusMsgs]: [Record<string, string>, any] = useState({});

    useEffect(() => {
        const fetchMemberAvStylesAndStatus = () => {
            const newAvStyles: { [key: string]: React.CSSProperties } = {};
            const newStatusMsgs: { [key: string]: string } = {};

            members.map((member) => {
                try {
                    const presence = getPresenceFn(member.userId);
                    if (!presence) return;
                    newAvStyles[member.userId] = Object.keys(styles).includes(presence.presence) ? styles[presence.presence] : styles.offline;
                    newStatusMsgs[member.userId] = presence.presenceStatusMsg ?? presence.presence;
                } catch (error) {
                    // handle error if needed
                }
            });

            setAvStyles(newAvStyles);
            setStatusMsgs(newStatusMsgs);
        };

        fetchMemberAvStylesAndStatus();
    }, [members, mx]);

    return (
        <Box className={css.MembersDrawer} shrink="No" direction="Column">
            <Header className={css.MembersDrawerHeader} variant="Background" size="600">
                <Box grow="Yes" alignItems="Center" gap="200">
                    <Box grow="Yes" alignItems="Center" gap="200">
                        <Text title={getText('generic.member_count', room.getJoinedMemberCount())} size="H5" truncate>
                            {getText('generic.member_count', millify(room.getJoinedMemberCount()))}
                        </Text>
                    </Box>
                    <Box shrink="No" alignItems="Center">
                        <TooltipProvider
                            position="Bottom"
                            align="End"
                            offset={4}
                            tooltip={
                                <Tooltip>
                                    <Text>{getText('tooltip.close')}</Text>
                                </Tooltip>
                            }
                        >
                            {(triggerRef) => (
                                <IconButton
                                    ref={triggerRef}
                                    variant="Background"
                                    onClick={() => setPeopleDrawer(false)}
                                >
                                    <Icon size={1} path={mdiClose} />
                                </IconButton>
                            )}
                        </TooltipProvider>
                    </Box>
                </Box>
            </Header>
            <Box className={css.MemberDrawerContentBase} grow="Yes">
                <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover" hideTrack>
                    <Box className={css.MemberDrawerContent} direction="Column" gap="200">
                        <Box ref={scrollTopAnchorRef} className={css.DrawerGroup} direction="Column" gap="200">
                            <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                                <UseStateProvider initial={undefined}>
                                    {(anchor: RectCords | undefined, setAnchor) => (
                                        <PopOut
                                            anchor={anchor}
                                            position="Bottom"
                                            align="Start"
                                            offset={4}
                                            content={
                                                <FocusTrap
                                                    focusTrapOptions={{
                                                        initialFocus: false,
                                                        onDeactivate: () => setAnchor(undefined),
                                                        clickOutsideDeactivates: true,
                                                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                                                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                                                    }}
                                                >
                                                    <Menu style={{ padding: config.space.S100 }}>
                                                        {membershipFilterMenu.map((menuItem, index) => (
                                                            <MenuItem
                                                                key={menuItem.name}
                                                                variant={
                                                                    menuItem.name === membershipFilter.name
                                                                        ? menuItem.color
                                                                        : 'Surface'
                                                                }
                                                                aria-pressed={menuItem.name === membershipFilter.name}
                                                                size="300"
                                                                radii="300"
                                                                onClick={() => {
                                                                    setMembershipFilterIndex(index);
                                                                    setAnchor(undefined);
                                                                }}
                                                            >
                                                                <Text size="T300">{menuItem.name}</Text>
                                                            </MenuItem>
                                                        ))}
                                                    </Menu>
                                                </FocusTrap>
                                            }
                                        >
                                            <Chip
                                                onClick={
                                                    ((evt) =>
                                                        setAnchor(
                                                            evt.currentTarget.getBoundingClientRect()
                                                        )) as MouseEventHandler<HTMLButtonElement>
                                                }
                                                variant={membershipFilter.color}
                                                size="400"
                                                radii="300"
                                                before={<Icon size={1} path={mdiFilterOutline} />}
                                            >
                                                <Text size="T200">{membershipFilter.name}</Text>
                                            </Chip>
                                        </PopOut>
                                    )}
                                </UseStateProvider>
                                <UseStateProvider initial={undefined}>
                                    {(anchor: RectCords | undefined, setAnchor) => (
                                        <PopOut
                                            anchor={anchor}
                                            position="Bottom"
                                            align="End"
                                            offset={4}
                                            content={
                                                <FocusTrap
                                                    focusTrapOptions={{
                                                        initialFocus: false,
                                                        onDeactivate: () => setAnchor(undefined),
                                                        clickOutsideDeactivates: true,
                                                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                                                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                                                    }}
                                                >
                                                    <Menu style={{ padding: config.space.S100 }}>
                                                        {sortFilterMenu.map((menuItem, index) => (
                                                            <MenuItem
                                                                key={menuItem.name}
                                                                variant="Surface"
                                                                aria-pressed={menuItem.name === sortFilter.name}
                                                                size="300"
                                                                radii="300"
                                                                onClick={() => {
                                                                    setSortFilterIndex(index);
                                                                    setAnchor(undefined);
                                                                }}
                                                            >
                                                                <Text size="T300">{menuItem.name}</Text>
                                                            </MenuItem>
                                                        ))}
                                                    </Menu>
                                                </FocusTrap>
                                            }
                                        >
                                            <Chip
                                                onClick={
                                                    ((evt) =>
                                                        setAnchor(
                                                            evt.currentTarget.getBoundingClientRect()
                                                        )) as MouseEventHandler<HTMLButtonElement>
                                                }
                                                variant="Background"
                                                size="400"
                                                radii="300"
                                                after={<Icon size={1} path={mdiSort} />}
                                            >
                                                <Text size="T200">{sortFilter.name}</Text>
                                            </Chip>
                                        </PopOut>
                                    )}
                                </UseStateProvider>
                            </Box>
                            <Box direction="Column" gap="100">
                                <Input
                                    ref={searchInputRef}
                                    onChange={handleSearchChange}
                                    style={{ paddingRight: config.space.S200 }}
                                    placeholder={getText('placeholder.search_name')}
                                    variant="Surface"
                                    size="400"
                                    radii="400"
                                    before={<Icon size={1} path={mdiMagnify} />}
                                    after={
                                        result && (
                                            <Chip
                                                variant={result.items.length > 0 ? 'Success' : 'Critical'}
                                                size="400"
                                                radii="Pill"
                                                aria-pressed
                                                onClick={() => {
                                                    if (searchInputRef.current) {
                                                        searchInputRef.current.value = '';
                                                        searchInputRef.current.focus();
                                                    }
                                                    resetSearch();
                                                }}
                                                after={<Icon size={1} path={mdiClose} />}
                                            >
                                                <Text size="B300">{result.items.length ? getText('generic.result_count', result.items.length) : getText('generic.no_results.2')}</Text>
                                            </Chip>
                                        )
                                    }
                                />
                            </Box>
                        </Box>

                        <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
                            <IconButton
                                onClick={() => virtualizer.scrollToOffset(0)}
                                variant="Surface"
                                radii="Pill"
                                outlined
                                size="300"
                                aria-label={getText('aria.scroll_to_top')}
                            >
                                <Icon size={1} path={mdiChevronUp} />
                            </IconButton>
                        </ScrollTopContainer>

                        {!fetchingMembers && !result && processMembers.length === 0 && (
                            <Text style={{ padding: config.space.S300 }} align="Center">
                                {getText(`members_drawer.no_members.${membershipFilter.id}`)}
                            </Text>
                        )}

                        <Box className={css.MembersGroup} direction="Column" gap="100">
                            <div
                                style={{
                                    position: 'relative',
                                    height: virtualizer.getTotalSize(),
                                }}
                            >
                                {virtualizer.getVirtualItems().map((vItem) => {
                                    const tagOrMember = PLTagOrRoomMember[vItem.index];
                                    if (!('userId' in tagOrMember)) {
                                        return (
                                            <Text
                                                style={{
                                                    transform: `translateY(${vItem.start}px)`,
                                                }}
                                                data-index={vItem.index}
                                                ref={virtualizer.measureElement}
                                                key={`${room.roomId}-${vItem.index}`}
                                                className={classNames(css.MembersGroupLabel, css.DrawerVirtualItem)}
                                                size="L400"
                                            >
                                                {tagOrMember.name}
                                            </Text>
                                        );
                                    }

                                    const member = tagOrMember;
                                    const name = getName(member);
                                    const avatarUrl = member.getAvatarUrl(
                                        mx.baseUrl,
                                        100,
                                        100,
                                        'crop',
                                        undefined,
                                        false
                                    );

                                    return (
                                        <MenuItem
                                            style={{
                                                padding: `0 ${config.space.S400}`,
                                                transform: `translateY(${vItem.start}px)`
                                            }}
                                            data-index={vItem.index}
                                            data-user-id={member.userId}
                                            ref={virtualizer.measureElement}
                                            key={`${room.roomId}-${member.userId}`}
                                            className={css.DrawerVirtualItem}
                                            variant="Background"
                                            radii="400"
                                            onClick={handleMemberClick}
                                            before={
                                                <Avatar style={avStyles[member.userId]} size="300">
                                                    <UserAvatar
                                                        userId={member.userId}
                                                        src={avatarUrl ?? undefined}
                                                        alt={name}
                                                        renderFallback={() => <Icon size={1} path={mdiAccount} />}
                                                    />
                                                </Avatar>
                                            }
                                            after={
                                                typingMembers.find((receipt) => receipt.userId === member.userId) && (
                                                    <Badge size="300" variant="Secondary" fill="Soft" radii="Pill" outlined>
                                                        <TypingIndicator size="300" />
                                                    </Badge>
                                                )
                                            }
                                        >
                                            <Box grow="Yes" direction='Column'>
                                                <Text size="T400" truncate>
                                                    {name}
                                                </Text>
                                                <Text size="C400" truncate>
                                                    {statusMsgs[member.userId]}
                                                </Text>
                                            </Box>
                                        </MenuItem>
                                    );
                                })}
                            </div>
                        </Box>

                        {fetchingMembers && (
                            <Box justifyContent="Center">
                                <Spinner />
                            </Box>
                        )}
                    </Box>
                </Scroll>
            </Box>
        </Box>
    );
}
