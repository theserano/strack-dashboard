'use client';
import { mainNav, otherNav } from '../utils/config';
import { Avatar, AvatarFallback } from '../../../@/components/ui/avatar';
import { Separator } from '../../../@/components/ui/separator';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { showToast, truncateText } from '../utils/plainFunctions';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../hook';
import { logoutUser } from '../features/auth/thunkActions';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { tokenManager } from '../utils/auth';

const Sidebar = ({ open = false, onClose }: { open?: boolean; onClose?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoggingOut } = useAppSelector((state) => state.auth);
  const currentUser = useAppSelector((state) => state.user.user);
  const displayName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.businessName || 'Your account';
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  // Below 640px the sidebar is a slide-in drawer; close it after navigating.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
    {open && <div className="fixed inset-0 z-30 bg-black/50 sm:hidden" onClick={onClose} aria-hidden />}
    <div
      className={`
        fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto sm:static sm:z-auto sm:overflow-visible
        sm:h-auto border-r bg-background flex flex-col justify-between
        sm:w-16 lg:w-64 transition-transform sm:transition-all duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0
      `}
    >
      {/* Top Section */}
      <div>
        {/* Logo */}
        <div className="px-3 lg:px-6 py-5 flex items-center gap-3 sm:justify-center lg:justify-start">
          <Logo imageOnly={true} />
          <span className="text-base font-semibold sm:hidden lg:inline-block">
            {truncateText({
              text: 'LeanTeams Inc.',
              length: 16,
            })}
          </span>
        </div>

        <Separator className="sm:hidden lg:block" />

        {/* MAIN Navigation */}
        <div className="mt-4 lg:mt-6">
          <p className="px-6 text-xs text-muted-foreground font-medium mb-3 tracking-wide sm:hidden lg:block">
            MAIN
          </p>

          <nav className="space-y-1 px-1 lg:px-3">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 sm:gap-0 lg:gap-3 
                    p-2 lg:px-3 lg:py-2.5 text-sm
                    sm:justify-center lg:justify-start
                    text-foreground/70 hover:bg-accent hover:text-accent-foreground 
                    transition-colors rounded-lg
                    ${active && 'bg-accent text-accent-foreground font-medium'}
                  `}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="sm:hidden lg:inline-block">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* OTHERS Navigation */}
        <div className="mt-8">
          <p className="px-6 text-xs text-muted-foreground font-medium mb-3 tracking-wide sm:hidden lg:block">
            OTHERS
          </p>

          <nav className="space-y-1 px-1 lg:px-3">
            {otherNav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <div key={item.name}>
                  {item.name === 'Logout' ? (
                    <div
                      key={item.href}
                      className={`
                    flex items-center gap-3 sm:gap-0 lg:gap-3 
                    p-2 lg:px-3 lg:py-2.5 text-sm
                    sm:justify-center lg:justify-start
                    text-foreground/70 hover:bg-accent hover:text-accent-foreground 
                    transition-colors rounded-lg cursor-pointer
                    ${active && 'bg-accent text-accent-foreground font-medium'}
                  `}
                      onClick={() => {
                        dispatch(
                          logoutUser({
                            onFailure: () => {
                              showToast({
                                message: 'Failed ',
                                description: 'Logout failed. Please try again.',
                              });
                            },
                            onSuccess: () => {
                              showToast({
                                message: 'Success',
                                description: 'You have been logged out successfully.',
                              });
                              tokenManager.clear();
                              router.push(item.href);
                            },
                          })
                        );
                      }}
                    >
                      {isLoggingOut ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      )}
                      <span className="sm:hidden lg:inline-block">{item.name}</span>
                    </div>
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                    flex items-center gap-3 sm:gap-0 lg:gap-3 
                    p-2 lg:px-3 lg:py-2.5 text-sm
                    sm:justify-center lg:justify-start
                    text-foreground/70 hover:bg-accent hover:text-accent-foreground 
                    transition-colors rounded-lg
                    ${active && 'bg-accent text-accent-foreground font-medium'}
                  `}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                      <span className="sm:hidden lg:inline-block">{item.name}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom User Section */}
      <div>
        <Separator className="sm:hidden lg:block" />

        <div className="p-4 lg:p-6 flex items-center sm:justify-center lg:justify-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>

          {/* Hide user details in collapsed mode */}
          <div className="flex-1 min-w-0 sm:hidden lg:block">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
