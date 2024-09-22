import React from 'react';
import {
    Outlet,
    Route,
    createBrowserRouter,
    createHashRouter,
    createRoutesFromElements,
    redirect,
    useLocation,
} from 'react-router-dom';

import { motion, AnimatePresence, Variants } from 'framer-motion';

import { ClientConfig } from '../hooks/useClientConfig';
import { AuthLayout, Login, Register, ResetPassword } from './auth';
import {
    DIRECT_PATH,
    EXPLORE_PATH,
    HOME_PATH,
    LOGIN_PATH,
    INBOX_PATH,
    REGISTER_PATH,
    RESET_PASSWORD_PATH,
    SPACE_PATH,
    _CREATE_PATH,
    _FEATURED_PATH,
    _INVITES_PATH,
    _JOIN_PATH,
    _LOBBY_PATH,
    _NOTIFICATIONS_PATH,
    _ROOM_PATH,
    _SEARCH_PATH,
    _SERVER_PATH,
} from './paths';
import { isAuthenticated } from '../../client/state/auth';
import {
    getAppPathFromHref,
    getExploreFeaturedPath,
    getHomePath,
    getInboxNotificationsPath,
    getLoginPath,
    getOriginBaseUrl,
    getSpaceLobbyPath,
} from './pathUtils';
import { ClientBindAtoms, ClientLayout, ClientRoot } from './client';
import { Home, HomeRouteRoomProvider, HomeSearch } from './client/home';
import { Direct, DirectRouteRoomProvider } from './client/direct';
import { RouteSpaceProvider, Space, SpaceRouteRoomProvider, SpaceSearch } from './client/space';
import { Explore, FeaturedRooms, PublicRooms } from './client/explore';
import { Notifications, Inbox, Invites } from './client/inbox';
import { setAfterLoginRedirectPath } from './afterLoginRedirectPath';
import { Room } from '../features/room';
import { Lobby } from '../features/lobby';
import { WelcomePage } from './client/WelcomePage';
import { SidebarNav } from './client/SidebarNav';
import { PageRoot } from '../components/page';
import { ScreenSize } from '../hooks/useScreenSize';
import { MobileFriendlyPageNav, MobileFriendlyClientNav } from './MobileFriendly';
import { ClientInitStorageAtom } from './client/ClientInitStorageAtom';
import { ClientNonUIFeatures } from './client/ClientNonUIFeatures';

const routeVariants: Variants = {
    initial: {
        translateX: '30%'
    },
    final: {
        translateX: '0%',
    },
};

export const createRouter = (clientConfig: ClientConfig, screenSize: ScreenSize) => {
    const { hashRouter } = clientConfig;
    const mobile = screenSize === ScreenSize.Mobile;

    const routes = createRoutesFromElements(
        <Route>
            <Route
                index
                loader={() => {
                    if (isAuthenticated()) return redirect(getHomePath());
                    const afterLoginPath = getAppPathFromHref(getOriginBaseUrl(), window.location.href);
                    if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
                    return redirect(getLoginPath());
                }}
            />
            <Route
                loader={() => {
                    if (isAuthenticated()) {
                        return redirect(getHomePath());
                    }

                    return null;
                }}
                element={<AuthLayout />}
            >
                <Route path={LOGIN_PATH} element={<Login />} />
                <Route path={REGISTER_PATH} element={<Register />} />
                <Route path={RESET_PASSWORD_PATH} element={<ResetPassword />} />
            </Route>

            <Route
                loader={() => {
                    if (!isAuthenticated()) {
                        const afterLoginPath = getAppPathFromHref(
                            getOriginBaseUrl(hashRouter),
                            window.location.href
                        );
                        if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
                        return redirect(getLoginPath());
                    }
                    return null;
                }}
                element={
                    <ClientRoot>
                        <ClientInitStorageAtom>
                            <ClientBindAtoms>
                                <ClientNonUIFeatures>
                                    <ClientLayout
                                        nav={
                                            <MobileFriendlyClientNav>
                                                <SidebarNav />
                                            </MobileFriendlyClientNav>
                                        }
                                    >
                                        <Outlet />
                                    </ClientLayout>
                                </ClientNonUIFeatures>
                            </ClientBindAtoms>
                        </ClientInitStorageAtom>
                    </ClientRoot>
                }
            >
                <Route
                    path={HOME_PATH}
                    element={
                        <PageRoot
                            nav={
                                <MobileFriendlyPageNav path={HOME_PATH}>
                                    <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants} layoutScroll>
                                        <Home />
                                    </motion.div>
                                </MobileFriendlyPageNav>
                            }
                        >
                            <Outlet />
                        </PageRoot>
                    }
                >
                    {mobile ? null : <Route index element={<WelcomePage />} />}
                    <Route path={_CREATE_PATH} element={<p>create</p>} />
                    <Route path={_JOIN_PATH} element={<p>join</p>} />
                    <Route path={_SEARCH_PATH} element={<HomeSearch />} />
                    <Route
                        path={_ROOM_PATH}
                        element={
                            <HomeRouteRoomProvider>
                                <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants} layoutScroll>
                                    <Room />
                                </motion.div>
                            </HomeRouteRoomProvider>
                        }
                    />
                </Route>
                <Route
                    path={DIRECT_PATH}
                    element={
                        <PageRoot
                            nav={
                                <MobileFriendlyPageNav path={DIRECT_PATH}>
                                    <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants} layoutScroll>
                                        <Direct />
                                    </motion.div>
                                </MobileFriendlyPageNav>
                            }
                        >
                            <Outlet />
                        </PageRoot>
                    }
                >
                    {mobile ? null : <Route index element={<WelcomePage />} />}
                    <Route path={_CREATE_PATH} element={<p>create</p>} />
                    <Route
                        path={_ROOM_PATH}
                        element={
                            <DirectRouteRoomProvider>
                                <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}>
                                    <Room />
                                </motion.div>
                            </DirectRouteRoomProvider>
                        }
                    />
                </Route>
                <Route
                    path={SPACE_PATH}
                    element={
                        <RouteSpaceProvider>
                            <PageRoot
                                nav={
                                    <MobileFriendlyPageNav path={SPACE_PATH}>
                                        <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}>
                                            <Space />
                                        </motion.div>
                                    </MobileFriendlyPageNav>
                                }
                            >
                                <Outlet />
                            </PageRoot>
                        </RouteSpaceProvider>
                    }
                >
                    {mobile ? null : (
                        <Route
                            index
                            loader={({ params }) => {
                                const { spaceIdOrAlias } = params;
                                if (spaceIdOrAlias) {
                                    return redirect(getSpaceLobbyPath(spaceIdOrAlias));
                                }
                                return null;
                            }}
                            element={<motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}><WelcomePage /></motion.div>}
                        />
                    )}
                    <Route path={_LOBBY_PATH} element={<Lobby />} />
                    <Route path={_SEARCH_PATH} element={<SpaceSearch />} />
                    <Route
                        path={_ROOM_PATH}
                        element={
                            <SpaceRouteRoomProvider>
                                <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}>
                                    <Room />
                                </motion.div>
                            </SpaceRouteRoomProvider>
                        }
                    />
                </Route>
                <Route
                    path={EXPLORE_PATH}
                    element={
                        <PageRoot
                            nav={
                                <MobileFriendlyPageNav path={EXPLORE_PATH}>
                                    <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}>
                                        <Explore />
                                    </motion.div>
                                </MobileFriendlyPageNav>
                            }
                        >
                            <Outlet />
                        </PageRoot>
                    }
                >
                    {mobile ? null : (
                        <Route
                            index
                            loader={() => redirect(getExploreFeaturedPath())}
                            element={<motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}><WelcomePage /></motion.div>}
                        />
                    )}
                    <Route path={_FEATURED_PATH} element={<motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}><FeaturedRooms /></motion.div>} />
                    <Route path={_SERVER_PATH} element={<motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}><PublicRooms /></motion.div>} />
                </Route>
                <Route
                    path={INBOX_PATH}
                    element={
                        <PageRoot
                            nav={
                                <MobileFriendlyPageNav path={INBOX_PATH}>
                                    <motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}>
                                        <Inbox />
                                    </motion.div>
                                </MobileFriendlyPageNav>
                            }
                        >
                            <Outlet />
                        </PageRoot>
                    }
                >
                    {mobile ? null : (
                        <Route
                            index
                            loader={() => redirect(getInboxNotificationsPath())}
                            element={<motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}><WelcomePage /></motion.div>}
                        />
                    )}
                    <Route path={_NOTIFICATIONS_PATH} element={<motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}><Notifications /></motion.div>} />
                    <Route path={_INVITES_PATH} element={<motion.div initial="initial" animate='final' style={{ display: 'flex', width: '100%' }} variants={routeVariants}><Invites /></motion.div>} />
                </Route>
            </Route>
            <Route path="/*" element={<p>Page not found</p>} />
        </Route>
    );

    if (hashRouter?.enabled) {
        return createHashRouter(routes, { basename: hashRouter.basename });
    }
    return createBrowserRouter(routes, {
        basename: import.meta.env.BASE_URL,
    });
};
