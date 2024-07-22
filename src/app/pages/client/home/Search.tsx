import React, { useRef } from 'react';
import { Box, Icon, Icons, Text, Scroll } from 'folds';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { MessageSearch } from '../../../features/message-search';
import { useHomeRooms } from './useHomeRooms';
import { getText } from '../../../../lang';

export function HomeSearch() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const rooms = useHomeRooms();

    return (
        <Page>
            <PageHeader>
                <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
                    <Icon size="400" src={Icons.Search} />
                    <Text size="H3">
                        {getText('msg_search.title')}
                    </Text>
                </Box>
            </PageHeader>
            <Box style={{ position: 'relative' }} grow="Yes">
                <Scroll ref={scrollRef} hideTrack visibility="Hover">
                    <PageContent>
                        <PageContentCenter>
                            <MessageSearch
                                defaultRoomsFilterName="Home"
                                allowGlobal
                                rooms={rooms}
                                scrollRef={scrollRef}
                            />
                        </PageContentCenter>
                    </PageContent>
                </Scroll>
            </Box>
        </Page>
    );
}
