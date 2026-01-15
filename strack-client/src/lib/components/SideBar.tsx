'use client';
import { mainNav, otherNav } from '../utils/config';
import { Avatar, AvatarFallback, AvatarImage } from '../../../@/components/ui/avatar';
import { Separator } from '../../../@/components/ui/separator';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { showToast, truncateText } from '../utils/plainFunctions';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../hook';
import { logoutUser } from '../features/auth/thunkActions';
import { Loader2 } from 'lucide-react';
import { tokenManager } from '../utils/auth';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoggingOut } = useAppSelector((state) => state.auth);

  return (
    <div
      className="
        h-screen border-r bg-background flex flex-col justify-between 
        w-16 lg:w-64 transition-all duration-300
      "
    >
      {/* Top Section */}
      <div>
        {/* Logo */}
        <div className="px-3 lg:px-6 py-5 flex items-center gap-3 justify-center lg:justify-start">
          <Logo imageOnly={true} />
          <span className="text-base font-semibold hidden lg:inline-block">
            {truncateText({
              text: 'LeanTeams Inc.',
              length: 16,
            })}
          </span>
        </div>

        <Separator className="hidden lg:block" />

        {/* MAIN Navigation */}
        <div className="mt-4 lg:mt-6">
          <p className="px-6 text-xs text-muted-foreground font-medium mb-3 tracking-wide hidden lg:block">
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
                    flex items-center gap-0 lg:gap-3 
                    p-2 lg:px-3 lg:py-2.5 text-sm
                    justify-center lg:justify-start
                    text-foreground/70 hover:bg-accent hover:text-accent-foreground 
                    transition-colors rounded-lg
                    ${active && 'bg-accent text-accent-foreground font-medium'}
                  `}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="hidden lg:inline-block">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* OTHERS Navigation */}
        <div className="mt-8">
          <p className="px-6 text-xs text-muted-foreground font-medium mb-3 tracking-wide hidden lg:block">
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
                    flex items-center gap-0 lg:gap-3 
                    p-2 lg:px-3 lg:py-2.5 text-sm
                    justify-center lg:justify-start
                    text-foreground/70 hover:bg-accent hover:text-accent-foreground 
                    transition-colors rounded-lg cursor-pointer
                    ${active && 'bg-accent text-accent-foreground font-medium'}
                  `}
                      onClick={() => {
                        dispatch(
                          logoutUser({
                            onFailure: (error) => {
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
                      <span className="hidden lg:inline-block">{item.name}</span>
                    </div>
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                    flex items-center gap-0 lg:gap-3 
                    p-2 lg:px-3 lg:py-2.5 text-sm
                    justify-center lg:justify-start
                    text-foreground/70 hover:bg-accent hover:text-accent-foreground 
                    transition-colors rounded-lg
                    ${active && 'bg-accent text-accent-foreground font-medium'}
                  `}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                      <span className="hidden lg:inline-block">{item.name}</span>
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
        <Separator className="hidden lg:block" />

        <div className="p-4 lg:p-6 flex items-center justify-center lg:justify-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://github.com/shadcn.png" alt="Emmanuel Edward" />
            <AvatarFallback className="bg-primary text-primary-foreground">ZS</AvatarFallback>
          </Avatar>

          {/* Hide user details in collapsed mode */}
          <div className="flex-1 min-w-0 hidden lg:block">
            <p className="text-sm font-medium truncate">Emmanuel Edward</p>
            <p className="text-xs text-muted-foreground truncate">emmanuel@straqa.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
