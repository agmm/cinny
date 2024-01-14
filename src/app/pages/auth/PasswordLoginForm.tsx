import React, { FormEventHandler, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Link, generatePath } from 'react-router-dom';
import { MatrixError } from 'matrix-js-sdk';
import { getMxIdLocalPart, getMxIdServer, isUserId } from '../../utils/matrix';
import { EMAIL_REGEX } from '../../utils/regex';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { REGISTER_PATH } from '../paths';
import { useAuthServer } from '../../hooks/useAuthServer';
import { useClientConfig } from '../../hooks/useClientConfig';
import {
  CustomLoginResponse,
  LoginError,
  factoryGetBaseUrl,
  login,
  useLoginComplete,
} from './loginUtil';
import { PasswordInput } from '../../components/password-input/PasswordInput';

function UsernameHint({ server }: { server: string }) {
  const [open, setOpen] = useState(false);
  return (
    <PopOut
      open={open}
      position="Top"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setOpen(false),
            clickOutsideDeactivates: true,
          }}
        >
          <Menu>
            <Header size="300" style={{ padding: `0 ${config.space.S200}` }}>
              <Text size="L400">Hint</Text>
            </Header>
            <Box
              style={{ padding: config.space.S200, paddingTop: 0 }}
              direction="Column"
              tabIndex={0}
              gap="100"
            >
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  Username:
                </Text>{' '}
                johndoe
              </Text>
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  Matrix ID:
                </Text>
                {` @johndoe:${server}`}
              </Text>
              <Text size="T300">
                <Text as="span" size="Inherit" priority="300">
                  Email:
                </Text>
                {` johndoe@${server}`}
              </Text>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {(targetRef) => (
        <IconButton
          tabIndex={-1}
          onClick={() => setOpen(true)}
          ref={targetRef}
          type="button"
          variant="Background"
          size="400"
          radii="300"
        >
          <Icon style={{ opacity: config.opacity.P300 }} size="100" src={Icons.Info} />
        </IconButton>
      )}
    </PopOut>
  );
}

function LoginFieldError({ message }: { message: string }) {
  return (
    <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
      <Icon size="50" filled src={Icons.Warning} />
      <Text size="T200">
        <b>{message}</b>
      </Text>
    </Box>
  );
}

type PasswordLoginFormProps = {
  defaultUsername?: string;
  defaultEmail?: string;
};
export function PasswordLoginForm({ defaultUsername, defaultEmail }: PasswordLoginFormProps) {
  const server = useAuthServer();
  const clientConfig = useClientConfig();

  const serverDiscovery = useAutoDiscoveryInfo();
  const baseUrl = serverDiscovery['m.homeserver'].base_url;

  const [loginState, startLogin] = useAsyncCallback<
    CustomLoginResponse,
    MatrixError,
    Parameters<typeof login>
  >(useCallback(login, []));

  useLoginComplete(loginState.status === AsyncStatus.Success ? loginState.data : undefined);

  const handleUsernameLogin = (username: string, password: string) => {
    startLogin(baseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user: username,
      },
      password,
      initial_device_display_name: 'Cinny Web',
    });
  };

  const handleMxIdLogin = async (mxId: string, password: string) => {
    const mxIdServer = getMxIdServer(mxId);
    const mxIdUsername = getMxIdLocalPart(mxId);
    if (!mxIdServer || !mxIdUsername) return;

    const getBaseUrl = factoryGetBaseUrl(clientConfig, mxIdServer);

    startLogin(getBaseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user: mxIdUsername,
      },
      password,
      initial_device_display_name: 'Cinny Web',
    });
  };
  const handleEmailLogin = (email: string, password: string) => {
    startLogin(baseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.thirdparty',
        medium: 'email',
        address: email,
      },
      password,
      initial_device_display_name: 'Cinny Web',
    });
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { usernameInput, passwordInput } = evt.target as HTMLFormElement & {
      usernameInput: HTMLInputElement;
      passwordInput: HTMLInputElement;
    };

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username) {
      usernameInput.focus();
      return;
    }
    if (!password) {
      passwordInput.focus();
      return;
    }

    if (isUserId(username)) {
      handleMxIdLogin(username, password);
      return;
    }
    if (EMAIL_REGEX.test(username)) {
      handleEmailLogin(username, password);
      return;
    }
    handleUsernameLogin(username, password);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          Username
        </Text>
        <Input
          defaultValue={defaultUsername ?? defaultEmail}
          style={{ paddingRight: config.space.S200 }}
          name="usernameInput"
          variant="Background"
          size="500"
          required
          outlined
          after={<UsernameHint server={server} />}
        />
        {loginState.status === AsyncStatus.Error && (
          <>
            {loginState.error.errcode === LoginError.ServerNotAllowed && (
              <LoginFieldError message="Login with custom server not allowed by your client instance." />
            )}
            {loginState.error.errcode === LoginError.InvalidServer && (
              <LoginFieldError message="Failed to find your Matrix ID server." />
            )}
          </>
        )}
      </Box>
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          Password
        </Text>
        <PasswordInput name="passwordInput" variant="Background" size="500" outlined required />
        <Box alignItems="Start" justifyContent="SpaceBetween" gap="200">
          {loginState.status === AsyncStatus.Error && (
            <>
              {loginState.error.errcode === LoginError.Forbidden && (
                <LoginFieldError message="Invalid Username or Password." />
              )}
              {loginState.error.errcode === LoginError.UserDeactivated && (
                <LoginFieldError message="This account has been deactivated." />
              )}
              {loginState.error.errcode === LoginError.InvalidRequest && (
                <LoginFieldError message="Failed to login. Part of your request data is invalid." />
              )}
              {loginState.error.errcode === LoginError.RateLimited && (
                <LoginFieldError message="Failed to login. Your login request has been rate-limited by server, Please try after some time." />
              )}
              {loginState.error.errcode === LoginError.Unknown && (
                <LoginFieldError message="Failed to login. Unknown reason." />
              )}
            </>
          )}
          <Box grow="Yes" shrink="No" justifyContent="End">
            <Text as="span" size="T200" priority="300" align="Right">
              {/* TODO: make reset password path */}
              <Link to={generatePath(REGISTER_PATH, { server })}>Forget Password?</Link>
            </Text>
          </Box>
        </Box>
      </Box>
      <Button type="submit" variant="Primary" size="500">
        <Text as="span" size="B500">
          Login
        </Text>
      </Button>

      <Overlay
        open={
          loginState.status === AsyncStatus.Loading || loginState.status === AsyncStatus.Success
        }
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <Spinner variant="Secondary" size="600" />
        </OverlayCenter>
      </Overlay>
    </Box>
  );
}