#!/usr/bin/env bash
# wait-for-it.sh - Wait for a service to be ready
# Based on https://github.com/vishnubob/wait-for-it

WAITFORIT_cmdname=${0##*/}

echoerr() { if [[ $WAITFORIT_QUIET -ne 1 ]]; then echo "$@" 1>&2; fi }

usage()
{
    cat << USAGE >&2
Usage:
    $WAITFORIT_cmdname host:port [-s] [-t timeout] [-- command args]
    -h HOST | --host=HOST       Host or IP under test
    -p PORT | --port=PORT       TCP port under test
                                Alternatively, you specify the host and port as host:port
    -s | --strict               Only execute subcommand if the test succeeds
    -q | --quiet                Don't output any status messages
    -t TIMEOUT | --timeout=TIMEOUT
                                Timeout in seconds, zero for no timeout
    -- COMMAND ARGS             Execute command with args after the test finishes
USAGE
    exit 1
}

WAITFORIT_host=""
WAITFORIT_port=""
WAITFORIT_timeout=15
WAITFORIT_strict=0
WAITFORIT_quiet=0
WAITFORIT_CMD=""

while [[ $# -gt 0 ]]
do
    case "$1" in
        *:* )
        WAITFORIT_hostport=(${1//:/ })
        WAITFORIT_host=${WAITFORIT_hostport[0]}
        WAITFORIT_port=${WAITFORIT_hostport[1]}
        shift 1
        ;;
        -h)
        WAITFORIT_host="$2"
        if [[ $WAITFORIT_host == "" ]]; then break; fi
        shift 2
        ;;
        --host=*)
        WAITFORIT_host="${1#*=}"
        shift 1
        ;;
        -p)
        WAITFORIT_port="$2"
        if [[ $WAITFORIT_port == "" ]]; then break; fi
        shift 2
        ;;
        --port=*)
        WAITFORIT_port="${1#*=}"
        shift 1
        ;;
        -t)
        WAITFORIT_timeout="$2"
        if [[ $WAITFORIT_timeout == "" ]]; then break; fi
        shift 2
        ;;
        --timeout=*)
        WAITFORIT_timeout="${1#*=}"
        shift 1
        ;;
        -q | --quiet)
        WAITFORIT_quiet=1
        shift 1
        ;;
        -s | --strict)
        WAITFORIT_strict=1
        shift 1
        ;;
        --)
        shift
        WAITFORIT_CMD="$@"
        break
        ;;
        --help)
        usage
        ;;
        *)
        echoerr "Unknown argument: $1"
        usage
        ;;
    esac
done

if [[ "$WAITFORIT_host" == "" || "$WAITFORIT_port" == "" ]]; then
    echoerr "Error: you need to provide a host and port to test."
    usage
fi

WAITFORIT_timeout=${WAITFORIT_timeout:-15}
WAITFORIT_strtimeout=$(echo $WAITFORIT_timeout | grep -Eo '^[0-9]+')
WAITFORIT_strtimeout=${WAITFORIT_strtimeout:-15}

if [[ $WAITFORIT_quiet -eq 0 ]]; then
    echoerr "$WAITFORIT_cmdname: waiting $WAITFORIT_strtimeout seconds for $WAITFORIT_host:$WAITFORIT_port"
fi

WAITFORIT_start_ts=$(date +%s)
while :
do
    if command -v nc >/dev/null 2>&1; then
        (echo > /dev/tcp/$WAITFORIT_host/$WAITFORIT_port) >/dev/null 2>&1
        WAITFORIT_result=$?
    elif command -v bash >/dev/null 2>&1; then
        (echo > /dev/tcp/$WAITFORIT_host/$WAITFORIT_port) >/dev/null 2>&1
        WAITFORIT_result=$?
    else
        echoerr "$WAITFORIT_cmdname: 'nc' or 'bash' command is required"
        exit 1
    fi

    if [[ $WAITFORIT_result -eq 0 ]]; then
        WAITFORIT_end_ts=$(date +%s)
        if [[ $WAITFORIT_quiet -eq 0 ]]; then
            echoerr "$WAITFORIT_cmdname: $WAITFORIT_host:$WAITFORIT_port is available after $((WAITFORIT_end_ts - WAITFORIT_start_ts)) seconds"
        fi
        break
    fi
    sleep 1
done

if [[ $WAITFORIT_CMD != "" ]]; then
    if [[ $WAITFORIT_strict -eq 0 ]]; then
        exec $WAITFORIT_CMD
    else
        exec $WAITFORIT_CMD
    fi
else
    exit 0
fi


